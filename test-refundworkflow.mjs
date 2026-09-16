// Testes do fluxo de reembolsos (spec v3 sec. 8 — dupla aprovação, prazos,
// reconciliação). Correr: node --experimental-strip-types test-refundworkflow.mjs

import {
  requestRefund,
  approveRefund,
  rejectRefund,
  markProcessing,
  settleRefund,
  cancelRefund,
  checkRefundDeadline,
  HIGH_RISK_REFUND_CENTAVOS,
  REFUND_DB_MAP,
} from "./lib/refundWorkflow.ts";

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

// ---- Pedido ----
const baseNow = "2026-03-01T12:00:00.000Z";
const low = requestRefund({
  id: "r1",
  dealId: "d1",
  amountCents: 50_000_000n, // 500.000 AOA → 1 aprovação
  reason: "Due diligence revelou ónus não declarado.",
  requestedById: "op-fin1",
  requesterRole: "FINANCEIRO",
  maxRefundableCents: 60_000_000n,
  nowIso: baseNow,
});
check("pedido válido (baixo valor) nasce SOLICITADO",
  low.refund?.status === "SOLICITADO" && !low.error);
check("pedido baixo exige 1 aprovação",
  low.refund?.requiredApprovals === 1);
check("pedido, causa e prazo guardados",
  low.refund?.dealId === "d1"
  && low.refund?.reason.includes("ónus")
  && low.refund.deadlineIso === "2026-03-06T12:00:00.000Z");

check("valor zero → erro",
  requestRefund({ id: "r0", dealId: "d1", amountCents: 0n, reason: "x", requestedById: "u", requesterRole: "FINANCEIRO" }).error !== undefined);
check("sem causa → erro",
  requestRefund({ id: "r0", dealId: "d1", amountCents: 1000n, reason: "   ", requestedById: "u", requesterRole: "FINANCEIRO" }).error !== undefined);
check("acima do teto recebido → erro",
  requestRefund({ id: "r0", dealId: "d1", amountCents: 1000n, reason: "causa válida", requestedById: "u", requesterRole: "FINANCEIRO", maxRefundableCents: 999n }).error !== undefined);
check("AGENT não pode pedir reembolso",
  requestRefund({ id: "r0", dealId: "d1", amountCents: 1000n, reason: "causa válida", requestedById: "agente", requesterRole: "AGENT" }).error !== undefined);

const high = requestRefund({
  id: "r2",
  dealId: "d1",
  amountCents: HIGH_RISK_REFUND_CENTAVOS,
  reason: "Comprador desistiu após visita; devolução da comissão.",
  requestedById: "op-fin1",
  requesterRole: "FINANCEIRO",
  nowIso: baseNow,
});
check("valor alto (>= 1.000.000 AOA) exige 2 aprovações",
  high.refund?.requiredApprovals === 2);

// ---- Aprovação (four-eyes) ----
check("self-approval → bloqueada",
  approveRefund(low.refund, { approverId: "op-fin1", approverRole: "FINANCEIRO" }).error !== undefined);

const a1 = approveRefund(low.refund, { approverId: "op-sup1", approverRole: "SUPERVISOR" });
check("1.ª aprovação (função diferente) fecha um pedido baixo",
  a1.refund?.status === "APROVADO" && a1.refund.approvals.length === 1);

const h1 = approveRefund(high.refund, { approverId: "op-sup1", approverRole: "SUPERVISOR" });
check("1.ª aprovação (pedido alto) → EM_APROVACAO",
  h1.refund?.status === "EM_APROVACAO" && h1.refund.approvals.length === 1);
const h2 = approveRefund(h1.refund, { approverId: "op-adm1", approverRole: "ADMIN_PRINCIPAL" });
check("2.ª aprovação liberta o reembolso alto",
  h2.refund?.status === "APROVADO" && h2.refund.approvals.length === 2);

check("mesma função do requerente (alto) → bloqueada",
  approveRefund(high.refund, { approverId: "op-fin2", approverRole: "FINANCEIRO" }).error !== undefined);
check("duplicar aprovador → bloqueado",
  approveRefund(h1.refund, { approverId: "op-sup1", approverRole: "SUPERVISOR" }).error !== undefined);
check("aprovador sem permissão (AGENT) → bloqueado",
  approveRefund(high.refund, { approverId: "agente", approverRole: "AGENT" }).error !== undefined);

// ---- Rejeição ----
check("rejeição sem motivo → erro",
  rejectRefund(low.refund, { approverId: "op-sup1", approverRole: "SUPERVISOR", reason: "  " }).error !== undefined);
check("rejeição pelo próprio requerente → bloqueada",
  rejectRefund(low.refund, { approverId: "op-fin1", approverRole: "FINANCEIRO", reason: "decisão" }).error !== undefined);
const rejected = rejectRefund(low.refund, { approverId: "op-sup1", approverRole: "SUPERVISOR", reason: "Documento de suporte ilegível." });
check("rejeição válida → REJEITADO com motivo",
  rejected.refund?.status === "REJECTED".replace("REJECTED", "REJEITADO") && rejected.refund.rejectionReason.includes("ilegível"));
check("não se aprova reembolso rejeitado",
  approveRefund(rejected.refund, { approverId: "op-sup2", approverRole: "SUPERVISOR" }).error !== undefined);

// ---- Processamento e liquidação ----
check("processamento sem método → erro",
  markProcessing(a1.refund, { operatorId: "op-fin3", operatorRole: "FINANCEIRO", method: "" }).error !== undefined);
check("processamento sem permissão (VERIFICADOR) → erro",
  markProcessing(a1.refund, { operatorId: "op-ver1", operatorRole: "VERIFICADOR", method: "MULTICAIXA" }).error !== undefined);
const proc = markProcessing(a1.refund, { operatorId: "op-fin3", operatorRole: "FINANCEIRO", method: "MULTICAIXA_EXPRESS" });
check("processamento → EM_PROCESSAMENTO com método",
  proc.refund?.status === "EM_PROCESSAMENTO" && proc.refund.method === "MULTICAIXA_EXPRESS");
check("só se processa reembolso aprovado",
  markProcessing(low.refund, { operatorId: "op-fin3", operatorRole: "FINANCEIRO", method: "MULTICAIXA" }).error !== undefined);

check("liquidação sem referência → erro (nunca print)",
  settleRefund(proc.refund, { ref: "" }).error !== undefined);
const settled = settleRefund(proc.refund, { ref: "MCX-2026-88123", proofUrl: "https://storage/in/recon.txt" });
check("liquidação com referência → REEMBOLSADO",
  settled.refund?.status === "REEMBOLSADO" && settled.refund.settledRef === "MCX-2026-88123");
check("não se liquida fora de processamento",
  settleRefund(a1.refund, { ref: "x" }).error !== undefined);

// ---- Cancelamento ----
check("terceiro não cancela pedido do outro",
  cancelRefund(low.refund, { byId: "op-sup1" }).error !== undefined);
check("requerente cancela → CANCELADO",
  cancelRefund(low.refund, { byId: "op-fin1" }).refund?.status === "CANCELADO");

// ---- Prazo/escalamento ----
check("aprovado antes do prazo → sem escalamento",
  checkRefundDeadline(low.refund, "2026-03-02T00:00:00.000Z").escalated === false);
const overdue = requestRefund({ id: "r3", dealId: "d1", amountCents: 1000n, reason: "causa", requestedById: "op-fin1", requesterRole: "FINANCEIRO", nowIso: "2026-02-01T00:00:00.000Z" });
const esc = checkRefundDeadline(overdue.refund, "2026-03-01T00:00:00.000Z");
check("pendente além do prazo → escalado para fila",
  esc.escalated === true && esc.reason?.includes("prazo"));
check("liquidado nunca escala",
  checkRefundDeadline(settled.refund, "2026-12-01T00:00:00.000Z").escalated === false);

// ---- Mapeamento BD ----
check("mapa BD: SOLICITADO→REQUESTED e REEMBOLSADO→PAID",
  REFUND_DB_MAP.SOLICITADO === "REQUESTED" && REFUND_DB_MAP.REEMBOLSADO === "PAID");

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);