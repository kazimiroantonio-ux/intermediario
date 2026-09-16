// ---------------------------------------------------------------------------
// test-agentpayout.mjs — finanças e solicitação de pagamento do agente
// (lib/agentPayout.ts). Valores em cêntimos AOA (BigInt).
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`PASS | ${name}`);
  } catch (err) {
    fail++;
    console.log(`FAIL | ${name} — ${err.message}`);
  }
}

const {
  aggregateCommissions,
  totalReceivedFromPayouts,
  canRequestPayout,
  buildPayoutRequest,
  normalizeIdempotencyKey,
  MIN_PAYOUT_MINOR,
  PAYOUT_REQUIREMENTS,
} = await import("./lib/agentPayout.ts");

test("MIN_PAYOUT_MINOR = 10.000 Kz em cêntimos (1_000_000)", () => {
  assert.equal(MIN_PAYOUT_MINOR, 1_000_000n);
});

test("aggregateCommissions: separa por estado e exclui PAYABLE já alocada", () => {
  const agg = aggregateCommissions([
    { status: "PAYABLE", agentAmount: 2_000_000n, payoutId: null },
    { status: "PAYABLE", agentAmount: 500_000n, payoutId: "pout-1" }, // já alocada → fora
    { status: "PENDING", agentAmount: 100_000n },
    { status: "ACCRUED", agentAmount: 200_000n },
    { status: "PAID", agentAmount: 50_000n },
    { status: "REVERSED", agentAmount: 30_000n },
    { status: "DISPUTED", agentAmount: 20_000n },
  ]);
  assert.equal(agg.availableMinor, 2_000_000n);
  assert.equal(agg.pendingMinor, 300_000n);
  assert.equal(agg.outstandingMinor, 2_300_000n);
  assert.equal(agg.commissionPaidMinor, 50_000n);
  assert.equal(agg.reversedMinor, 30_000n);
  assert.equal(agg.disputedMinor, 20_000n);
});

test("totalReceivedFromPayouts: soma apenas payouts PAID", () => {
  const total = totalReceivedFromPayouts([
    { status: "PAID", netAmount: 400_000n },
    { status: "FAILED", netAmount: 900_000n },
    { status: "DRAFT", netAmount: 999_000n },
    { status: "PAID", netAmount: 100_000n },
  ]);
  assert.equal(total, 500_000n);
});

test("canRequestPayout: sem saldo → bloqueia", () => {
  const r = canRequestPayout({ availableMinor: 0n, hasVerifiedBankAccount: true, hasPendingPayout: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, PAYOUT_REQUIREMENTS.NO_BALANCE);
});

test("canRequestPayout: abaixo do mínimo → bloqueia", () => {
  const r = canRequestPayout({ availableMinor: 100_000n, hasVerifiedBankAccount: true, hasPendingPayout: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, PAYOUT_REQUIREMENTS.BELOW_MIN);
});

test("canRequestPayout: sem conta bancária verificada → bloqueia", () => {
  const r = canRequestPayout({ availableMinor: MIN_PAYOUT_MINOR, hasVerifiedBankAccount: false, hasPendingPayout: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, PAYOUT_REQUIREMENTS.NO_BANK);
});

test("canRequestPayout: pedido pendente → bloqueia", () => {
  const r = canRequestPayout({ availableMinor: MIN_PAYOUT_MINOR, hasVerifiedBankAccount: true, hasPendingPayout: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, PAYOUT_REQUIREMENTS.PENDING);
});

test("canRequestPayout: pré-condições satisfeitas → ok", () => {
  const r = canRequestPayout({ availableMinor: MIN_PAYOUT_MINOR, hasVerifiedBankAccount: true, hasPendingPayout: false });
  assert.ok(r.ok);
});

test("canRequestPayout: mínimo customizável (testável)", () => {
  const r = canRequestPayout({ availableMinor: 50n, minPayoutMinor: 100n, hasVerifiedBankAccount: true, hasPendingPayout: false });
  assert.equal(r.ok, false);
});

test("buildPayoutRequest: período = mês corrente (UTC)", () => {
  const req = buildPayoutRequest({ nowIso: "2026-09-15T10:00:00.000Z", grossMinor: 3_000_000n });
  assert.equal(req.periodStartIso, "2026-09-01T00:00:00.000Z");
  assert.equal(req.periodEndIso, "2026-09-30T00:00:00.000Z");
  assert.equal(req.grossMinor, 3_000_000n);
  assert.equal(req.netMinor, 3_000_000n);
});

test("buildPayoutRequest: retenção deduzida e nunca net negativo", () => {
  const req = buildPayoutRequest({ nowIso: "2026-01-10T00:00:00.000Z", grossMinor: 1_000n, withholdingMinor: 2_000n });
  assert.equal(req.netMinor, 0n);
  const ok = buildPayoutRequest({ nowIso: "2026-01-10T00:00:00.000Z", grossMinor: 1_000n, withholdingMinor: 400n });
  assert.equal(ok.netMinor, 600n);
});

test("normalizeIdempotencyKey: trim; recusa vazia ou >128 chars", () => {
  assert.equal(normalizeIdempotencyKey("  key-1 "), "key-1");
  assert.equal(normalizeIdempotencyKey(""), null);
  assert.equal(normalizeIdempotencyKey(null), null);
  assert.equal(normalizeIdempotencyKey("x".repeat(129)), null);
});

console.log(`\n${pass + fail} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);