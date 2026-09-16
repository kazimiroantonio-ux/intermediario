// Testes das automações adicionais (spec v3 — prioridade 12).
// Correr: node --experimental-strip-types test-automations.mjs

import { runScheduledJobs } from "./lib/automations.ts";
import { startVerification } from "./lib/verificationWorkflow.ts";
import { requestRefund } from "./lib/refundWorkflow.ts";
import { createPayment, schedulePayment } from "./lib/paymentWorkflow.ts";

let pass = 0;
let fail = 0;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${label}`);
  } else {
    fail++;
    console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOW = "2026-04-10T12:00:00.000Z";
const has = (actions, type, id) => actions.some((a) => a.type === type && a.entityId === id);
const anyOn = (actions, type, id) => actions.some((a) => (a.type === "VERIFICATION_ESCALATE" || a.type === "VERIFICATION_REMIND") && a.entityId === id);

const pedro = { fullName: "José Manuel dos Santos", nif: "541720983", province: "Luanda", isCompany: false };
const bi = { docId: "d1", type: "bi", sha256: "aaa", holderName: "José Manuel dos Santos", nif: "541720983" };
const title = { docId: "d2", type: "title_deed", sha256: "bbb", holderName: "José Manuel dos Santos" };
const procura = { docId: "d3", type: "procura", sha256: "ccc", holderName: "José Manuel dos Santos" };
const ver = (id, now, days) => startVerification({ id, subjectType: "SELLER", subjectId: `u-${id}`, category: "IMOVEL", submittedBy: `u-${id}`, actorRole: "SELLER", subjectData: pedro, documents: [bi, title, procura], nowIso: now, deadlineDays: days }).ver;

const verOld = ver("v-old", "2026-03-01T00:00:00.000Z", 2); // vence 03-03 → atrasada
const verPerto = ver("v-perto", "2026-04-09T00:00:00.000Z", 2); // vence 04-11 → falta 1 dia
const verNovo = ver("v-novo", NOW, 30); // vence 05-10 → sem ação
const verAprovada = { ...ver("v-aprov", "2026-03-01T00:00:00.000Z", 2), status: "VERIFIED" };

const refundAtrasada = requestRefund({ id: "r-old", dealId: "d1", requesterId: "op-fin1", requesterRole: "FINANCEIRO", amountCents: 5_000_000n, reason: "x", nowIso: "2026-03-01T00:00:00.000Z" }).refund; // vence ~03-06
const refundOk = requestRefund({ id: "r-ok", dealId: "d2", requesterId: "op-fin1", requesterRole: "FINANCEIRO", amountCents: 5_000_000n, reason: "x", nowIso: NOW }).refund; // vence 04-15

const pAtrasado = schedulePayment(createPayment({ id: "p-atraso", dealId: "d3", description: "x", amountCents: 100_000n, actorId: "a", actorRole: "SYSTEM", nowIso: "2026-03-01T00:00:00.000Z" }).payment, { actorId: "a", actorRole: "SYSTEM", nowIso: "2026-03-01T00:00:00.000Z", dueDays: 3 }).payment; // vence 03-04
const pVelho = { ...pAtrasado, id: "p-rec-old", phase: "RECEBIDO", receivedAt: "2026-04-01T00:00:00.000Z" };
const pNovo = { ...pAtrasado, id: "p-rec-new", phase: "RECEBIDO", receivedAt: NOW };

const run = runScheduledJobs({
  nowIso: NOW,
  listings: [
    { id: "l-exp", status: "ACTIVE", expiresAtIso: "2026-04-01T00:00:00.000Z" },
    { id: "l-fut", status: "ACTIVE", expiresAtIso: "2026-05-01T00:00:00.000Z" },
    { id: "l-pausado", status: "VERIFIED", expiresAtIso: "2026-03-01T00:00:00.000Z" },
  ],
  verifications: [verOld, verPerto, verNovo, verAprovada],
  refunds: [refundAtrasada, refundOk],
  payments: [pAtrasado, pVelho, pNovo],
  subscriptions: [
    { userId: "u-prem", plan: "PREMIUM", expiresAtIso: "2026-04-01T00:00:00.000Z" },
    { userId: "u-ok", plan: "PREMIUM", expiresAtIso: "2026-05-01T00:00:00.000Z" },
    { userId: "u-free", plan: "FREE", expiresAtIso: "2026-04-01T00:00:00.000Z" },
  ],
});

check("anúncio ACTIVE expirado → EXPIRE; outros não",
  has(run.actions, "LISTING_EXPIRE", "l-exp") && !has(run.actions, "LISTING_EXPIRE", "l-fut")
  && !has(run.actions, "LISTING_EXPIRE", "l-pausado"));
check("verificação: atrasada → ESCALATE; perto do prazo → REMIND; recente/aprovada não",
  has(run.actions, "VERIFICATION_ESCALATE", "v-old") && has(run.actions, "VERIFICATION_REMIND", "v-perto")
  && !anyOn(run.actions, "*", "v-novo") && !anyOn(run.actions, "*", "v-aprov"));
check("reembolso antigo → ESCALATE; recente não",
  has(run.actions, "REFUND_ESCALATE", "r-old") && !has(run.actions, "REFUND_ESCALATE", "r-ok"));
check("pagamento AGUARDA em atraso → REMIND",
  has(run.actions, "PAYMENT_REMIND", "p-atraso"));
check("recebido há 2+ dias → lembrete de reconciliação; recém-recebido não",
  has(run.actions, "PAYMENT_RECONCILE_REMIND", "p-rec-old") && !has(run.actions, "PAYMENT_RECONCILE_REMIND", "p-rec-new"));
check("plano premium expirado → DOWNGRADE; ok/free não",
  has(run.actions, "SUBSCRIPTION_DOWNGRADE", "u-prem") && !has(run.actions, "SUBSCRIPTION_DOWNGRADE", "u-ok")
  && !has(run.actions, "SUBSCRIPTION_DOWNGRADE", "u-free"));

// ---- Idempotência / determinismo ----
const dup = runScheduledJobs({
  nowIso: NOW,
  listings: [{ id: "l-exp", status: "ACTIVE", expiresAtIso: "2026-04-01T00:00:00.000Z" }],
  verifications: [], refunds: [], payments: [], subscriptions: [],
  doneKeys: ["LISTING_EXPIRE:l-exp"],
});
check("doneKeys evita re-trigger (idempotente)",
  dup.actions.length === 0);

const twice = runScheduledJobs({
  nowIso: NOW,
  listings: [{ id: "l-x", status: "ACTIVE", expiresAtIso: "2026-03-01T00:00:00.000Z" }],
  verifications: [], refunds: [], payments: [], subscriptions: [],
});
const thrice = runScheduledJobs({
  nowIso: NOW,
  listings: [{ id: "l-x", status: "ACTIVE", expiresAtIso: "2026-03-01T00:00:00.000Z" }],
  verifications: [], refunds: [], payments: [], subscriptions: [],
});
check("determinismo: mesma entrada → mesmas ações",
  JSON.stringify(twice.actions) === JSON.stringify(thrice.actions) && twice.actions[0].auto === true);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);