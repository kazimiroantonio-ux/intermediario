// Testes da abstração PaymentProvider (Anexo B, sec. 5).
// Correr: node --experimental-strip-types test-paymentprovider.mjs

import {
  getPaymentProvider,
  makeIdempotencyKey,
  assertIdempotencyKey,
  IdempotencyGuard,
  hmacSignature,
  kzToMinor,
  minorToKz,
  ProxyPayProvider,
  PayPayProvider,
  BankTransferProvider,
  ProviderError,
} from "./services/paymentProvider.ts";

let pass = 0;
let fail = 0;
const failures = [];

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${label}`);
  } else {
    fail++;
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function throwsProviderError(fn, status) {
  try {
    await fn();
    return false;
  } catch (e) {
    return e instanceof ProviderError && (status === undefined || e.status === status);
  }
}

// ---- Idempotência ----

const k1 = makeIdempotencyKey("DEPOSIT", "deal-1");
const k2 = makeIdempotencyKey("DEPOSIT", "deal-1");
const k3 = makeIdempotencyKey("BALANCE", "deal-1");
check("idempotency: determinística no mesmo scope+id", k1 === k2 && k1.length === 64);
check("idempotency: distinta entre scopes", k1 !== k3);

check("idempotency: vazia rejeitada", await throwsProviderError(() => assertIdempotencyKey(""), 400));
check("idempotency: >128 rejeitada", await throwsProviderError(() => assertIdempotencyKey("x".repeat(129)), 400));
check("idempotency: válida aceite", (() => { assertIdempotencyKey(k1); return true; })());

// ---- Factory ----

check("factory: os três provedores resolvem", getPaymentProvider("PROXYPAY").name === "PROXYPAY"
  && getPaymentProvider("PAYPAY").name === "PAYPAY"
  && getPaymentProvider("BANK_TRANSFER").name === "BANK_TRANSFER");
check("factory: desconhecido rejeitado", await throwsProviderError(() => getPaymentProvider("BITCOIN"), 400));

// ---- ProxyPay (stub) ----

const px = new ProxyPayProvider({});

const pxCharge = await px.createCharge({
  amountMinor: 114_000_000n,
  idempotencyKey: k1,
  description: "Adesão 30% — negócio #D1",
});
check("ProxyPay stub: provider", pxCharge.provider === "PROXYPAY");
check("ProxyPay stub: referência de 9 dígitos", /^\d{9}$/.test(pxCharge.reference));
check("ProxyPay stub: validade ≈ 48h", Math.abs(pxCharge.expiresAt.getTime() - (Date.now() + 172_800_000)) < 5000);
check("ProxyPay stub: sem checkout", pxCharge.checkoutUrl === undefined);
check("ProxyPay stub: exige idempotency key", await throwsProviderError(
  () => px.createCharge({ amountMinor: 1n, idempotencyKey: "", description: "x" }), 400));

// ---- ProxyPay verifyCallback + HMAC ----

const cbBody = { reference: "123456789", amount: "1000.00", transaction_id: "TXN1", status: "PAID_THROUGH_REFERENCE" };
const cb = await px.verifyCallback(cbBody, {});
check("ProxyPay callback: sem segredo aceita e normaliza", cb !== null && cb.status === "PAID");
check("ProxyPay callback: referencia/conta correctas", cb.reference === "123456789" && cb.bankTxnRef === "TXN1");
check("ProxyPay callback: amountMinor 1.000,00 Kz = 100.000 cêntimos", cb.amountMinor === 100000n);

const pxSigned = new ProxyPayProvider({ PROXYPAY_WEBHOOK_SECRET: "segredo-teste" });
const bodyJson = JSON.stringify(cbBody);
const goodSig = hmacSignature("segredo-teste", bodyJson);
const signed = await pxSigned.verifyCallback(cbBody, { "x-proxypay-signature": goodSig });
check("ProxyPay callback: HMAC válido passa", signed !== null && signed.reference === "123456789");
check("ProxyPay callback: assinatura errada → 401", await throwsProviderError(
  () => pxSigned.verifyCallback(cbBody, { "x-proxypay-signature": "zzz" }), 401));
check("ProxyPay callback: sem assinatura com segredo → 401", await throwsProviderError(
  () => pxSigned.verifyCallback(cbBody, {}), 401));

// ---- PayPay (stub) ----

const pp = new PayPayProvider({});
const ppCharge = await pp.createCharge({
  amountMinor: 10_000_000n,
  idempotencyKey: k2,
  description: "Taxa de deslocação",
});
check("PayPay stub: referência hexadecimal", /^[0-9A-F]{16}$/.test(ppCharge.reference));
check("PayPay stub: checkoutUrl presente", (ppCharge.checkoutUrl ?? "").startsWith("https://"));

const ppPayout = await pp.payout({
  amountMinor: 2_500_000n,
  destination: "4111 1111 1111 1111",
  idempotencyKey: k3,
  method: "transfer_to_card",
});
check("PayPay stub: payout ok + PENDING", ppPayout.ok === true && ppPayout.status === "PENDING" && ppPayout.reference.startsWith("PPO-"));

const ppRefund = await pp.refund({ reference: ppCharge.reference, amountMinor: 10_000_000n, idempotencyKey: k1, reason: "teste" });
check("PayPay stub: refund ok", ppRefund.ok === true && ppRefund.idempotencyKey === k1);

const ppCb = await pp.verifyCallback(
  { reference: ppCharge.reference, amount: "100.00", transaction_id: "PPT1", status: "SUCCESS" },
  {}
);
check("PayPay callback: SUCCESS → PAID", ppCb !== null && ppCb.status === "PAID");
const ppCancelled = await pp.verifyCallback({ reference: "R2", status: "CANCELLED" }, {});
check("PayPay callback: CANCELLED → EXPIRED", ppCancelled !== null && ppCancelled.status === "EXPIRED");

// ---- BANK_TRANSFER ----

const bt = new BankTransferProvider();
const btCharge = await bt.createCharge({
  amountMinor: 89_550_000n,
  idempotencyKey: k1,
  description: "Saldo 70% — negócio #D1",
  referenceHint: "D1-BALANCE",
});
check("BANK_TRANSFER: usa referenceHint", btCharge.reference === "D1-BALANCE");
check("BANK_TRANSFER: sem checkout/webhook", btCharge.checkoutUrl === undefined);
const btCb = await bt.verifyCallback({ anything: true }, {});
check("BANK_TRANSFER: callback nulo (confirmação manual)", btCb === null);
const btPayout = await bt.payout({ amountMinor: 100n, destination: "STC", idempotencyKey: k2, method: "bank_transfer" });
check("BANK_TRANSFER: payout admin DONE", btPayout.ok && btPayout.status === "DONE");

// ---- Guard de idempotência (concorrência de webhooks) ----

const guard = new IdempotencyGuard(1000);
const gk = makeIdempotencyKey("WEBHOOK", "TXN1");
guard.mark(gk);
check("guard: segunda chamada é duplicada", guard.has(gk) === true);
guard.unmark(gk);
check("guard: unmark permite reprocessar", guard.has(gk) === false);
const guardTtl = new IdempotencyGuard(1);
const tk = makeIdempotencyKey("WEBHOOK", "TXN2");
guardTtl.mark(tk);
await new Promise((r) => setTimeout(r, 20));
check("guard: expira após TTL", guardTtl.has(tk) === false);

// ---- Unidades ----

check("unidades: minorToKz(100000) = 1000.00", minorToKz(100000n) === "1000.00");
check("unidades: kzToMinor(minorToKz) round-trip", kzToMinor(minorToKz(114_000_000n)) === 114_000_000n);

// ---- Mínimo de adesão decimal (negócio pequeno não zera o saldo) ----

const pxSmall = new ProxyPayProvider({});
const small = await pxSmall.createCharge({ amountMinor: 3_570n, idempotencyKey: k1, description: "pequeno" });
check("ProxyPay stub: valores pequenos aceites", /^\d{9}$/.test(small.reference));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) {
  console.log("\nFalhas:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}