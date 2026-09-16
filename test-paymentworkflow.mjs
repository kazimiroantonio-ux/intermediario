// Testes dos pagamentos/reconciliação (spec v3 — 10 estados).
// Correr: node --experimental-strip-types test-paymentworkflow.mjs

import {
  createPayment,
  schedulePayment,
  startPayment,
  markPendingBank,
  confirmPayment,
  failPayment,
  cancelPayment,
  reconcilePayment,
  linkRefund,
  settleRefundPayment,
  matchStatement,
  checkPaymentDeadline,
  paymentToQueueItem,
  canPhaseTransition,
  PAYMENT_DB_MAP,
} from "./lib/paymentWorkflow.ts";

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

const NOW = "2026-04-01T12:00:00.000Z";
const v = (x) => 2_500_000n; // 25.000 AOA

// ---- Estado base / máquina ----
const criado = createPayment({ id: "p1", dealId: "d1", commissionId: "c1", description: "Comissão 30%", amountCents: v(), clientId: "u9", actorId: "ag1", actorRole: "AGENT", nowIso: NOW }).payment;
check("criar → CRIADO com valor travado",
  criado.phase === "CRIADO" && criado.amountCents === 2_500_000n && criado.events[0].type === "PAYMENT_CREATED");
check("criar valor inválido → recusa",
  createPayment({ id: "pX", dealId: "d", description: "x", amountCents: 0n, actorId: "a", actorRole: "AGENT", nowIso: NOW }).error !== undefined);

const agendado = schedulePayment(criado, { actorId: "ag1", actorRole: "AGENT", nowIso: NOW, dueDays: 3 });
check("CRIADO→AGUARDA_PAGAMENTO com prazo de 3 dias",
  agendado.payment.phase === "AGUARDA_PAGAMENTO" && agendado.payment.dueIso?.startsWith("2026-04-04"));
check("agendar fora de CRIADO → recusa",
  schedulePayment(agendado.payment, { actorId: "ag1", actorRole: "AGENT" }).error !== undefined);

const iniciado = startPayment(agendado.payment, { clientId: "u9", method: "transferencia", agency: "MULTICAIXA", nowIso: NOW });
check("iniciar sessão → INICIADO",
  iniciado.payment.phase === "INICIADO" && iniciado.payment.agency === "MULTICAIXA");

const noBanco = markPendingBank(iniciado.payment, { agency: "MULTICAIXA", externalRef: "TX123", nowIso: NOW });
check("banco comunicou → PENDENTE_NO_BANCO",
  noBanco.payment.phase === "PENDENTE_NO_BANCO" && noBanco.payment.externalRef === "TX123");

// ---- Confirmação: certo / divergência / duplicado ----
const certo = confirmPayment(noBanco.payment, { gatewayId: "GW-1", amountCents: v(), nowIso: NOW });
check("confirmação com valor certo → RECEBIDO",
  certo.payment.phase === "RECEBIDO" && certo.payment.receivedAt === NOW);
check("confirmação duplicada → recusa",
  confirmPayment(certo.payment, { gatewayId: "GW-2", amountCents: v(), nowIso: NOW }).error !== undefined);

const divergente = confirmPayment(noBanco.payment, { gatewayId: "GW-3", amountCents: 1_000_000n, nowIso: NOW });
check("confirmação com valor divergente → FALHOU e evento de mismatch",
  divergente.payment.phase === "FALHOU" && divergente.payment.events.some((e) => e.type === "PAYMENT_MISMATCH"));

check("confirmar em estado final → recusa",
  confirmPayment(divergente.payment, { gatewayId: "X", amountCents: v(), nowIso: NOW }).error?.includes("final") === true);

// ---- Falha / cancelamento ----
check("cancelar antes de recebido → CANCELADO",
  cancelPayment(noBanco.payment, { actorId: "u9", actorRole: "CLIENT", note: "Desistiu.", nowIso: NOW }).payment.phase === "CANCELADO");
check("cancelar dinheiro já recebido → recusa (vai por reembolso)",
  cancelPayment(certo.payment, { actorId: "u9", actorRole: "CLIENT" }).error?.includes("reembolso") === true);
check("falha exige razão",
  failPayment(noBanco.payment, { actorId: "bank", actorRole: "PROVIDER", reason: " ", nowIso: NOW }).error !== undefined);

// ---- Reconciliação financeira ----
check("reconciliar fora de RECEBIDO → recusa",
  reconcilePayment(noBanco.payment, { operatorId: "op-f1", operatorRole: "FINANCEIRO", externalRef: "R1", amountCents: v(), nowIso: NOW }).error !== undefined);
check("AGENT não reconcilia (sem payments.reconcile)",
  reconcilePayment(certo.payment, { operatorId: "ag1", operatorRole: "AGENT", externalRef: "R1", amountCents: v(), nowIso: NOW }).error !== undefined);
check("reconciliação com valor errado → recusa",
  reconcilePayment(certo.payment, { operatorId: "op-f1", operatorRole: "FINANCEIRO", externalRef: "R1", amountCents: 1n, nowIso: NOW }).error?.includes("Divergência") === true);
const reconciliado = reconcilePayment(certo.payment, { operatorId: "op-f1", operatorRole: "FINANCEIRO", externalRef: "EXT-9", amountCents: v(), nowIso: NOW });
check("reconciliar → RECONCILIADO com referência",
  reconciliado.payment.phase === "RECONCILIADO" && reconciliado.payment.reconciledById === "op-f1");

const refund = linkRefund(reconciliado.payment, { refundId: "r1", operatorId: "op-f1", operatorRole: "FINANCEIRO", nowIso: NOW });
check("ligar reembolso → REEMBOLSO_PENDENTE",
  refund.payment.phase === "REEMBOLSO_PENDENTE" && refund.payment.refundId === "r1");
const liquidado = settleRefundPayment(refund.payment, { operatorId: "op-f1", operatorRole: "FINANCEIRO", externalRef: "REFUND-EXT", nowIso: NOW });
check("liquidar reembolso → REEMBOLSADO",
  liquidado.payment.phase === "REEMBOLSADO" && liquidado.payment.externalRef === "REFUND-EXT");
check("liquidar sem referência → recusa",
  settleRefundPayment(refund.payment, { operatorId: "op-f1", operatorRole: "FINANCEIRO", externalRef: " ", nowIso: NOW }).error !== undefined);

// ---- Máquina de transições ----
check("matriz de transições respeitada",
  canPhaseTransition("CRIADO", "AGUARDA_PAGAMENTO") === true
  && canPhaseTransition("RECEBIDO", "RECONCILIADO") === true
  && canPhaseTransition("CRIADO", "RECEBIDO") === false
  && canPhaseTransition("CANCELADO", "INICIADO") === false
  && canPhaseTransition("REEMBOLSADO", "REEMBOLSO_PENDENTE") === false);

// ---- Extrato (reconciliação em lote) ----
const incompat = createPayment({ id: "p2", dealId: "d1", description: "x", amountCents: 5_000_000n, actorId: "a", actorRole: "SYSTEM", nowIso: NOW });
const receb1 = confirmPayment(
  markPendingBank(startPayment(schedulePayment(incompat.payment, { actorId: "a", actorRole: "SYSTEM", nowIso: NOW }).payment, { clientId: "u9", method: "cc", agency: "BAI", nowIso: NOW }).payment, { agency: "BAI", externalRef: "T2", nowIso: NOW }).payment,
  { gatewayId: "G2", amountCents: 5_000_000n, nowIso: NOW }
).payment;
const batido = matchStatement([receb1], [{ lineId: "L1", amountCents: 5_000_000n, ref: "G2" }]);
check("extrato casa recebido → matched",
  batido.matched.length === 1 && batido.matched[0].paymentId === "p2" && batido.unmatchedLines.length === 0);
const batido2 = matchStatement([certo.payment], [{ lineId: "L9", amountCents: 9_000_000n }]);
check("linha sem correspondência → mismatch",
  batido2.mismatches.length === 1 && batido2.mismatches[0].reason.includes("sem linha"));

// ---- Prazo / fila ----
check("agendado dentro do prazo → sem escalamento",
  checkPaymentDeadline(agendado.payment, "2026-04-02T00:00:00.000Z").escalated === false);
const atrasado = checkPaymentDeadline(agendado.payment, "2026-04-10T00:00:00.000Z");
check("agendado com prazo ultrapassado → escalado",
  atrasado.escalated === true && atrasado.nextStep?.includes("Lembrar"));
check("recebido parado 48h → lembrete de reconciliação",
  checkPaymentDeadline({ ...certo.payment, receivedAt: "2026-03-28T12:00:00.000Z" }, NOW).nextStep?.includes("Reconciliar") === true);

const qi = paymentToQueueItem(certo.payment, NOW, "w1").item;
check("recebido → fila pagamento.nao_reconciliado ALTA",
  qi?.category === "pagamento.nao_reconciliado" && qi?.priority === "ALTA");
check("reembolsado → fora da fila",
  paymentToQueueItem(liquidado.payment, NOW, "w2").item === undefined);
check("mapa BD: RECEBIDO→APPROVED e FALHOU→REJECTED",
  PAYMENT_DB_MAP.RECEBIDO === "APPROVED" && PAYMENT_DB_MAP.FALHOU === "REJECTED" && PAYMENT_DB_MAP.REEMBOLSADO === "REFUNDED");

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);