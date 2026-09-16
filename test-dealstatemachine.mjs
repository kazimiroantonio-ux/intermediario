// Testes da máquina de estados do negócio (Anexo B — Opção 0, 30/70 + spec v3).
// Correr: node --experimental-strip-types test-dealstatemachine.mjs

import {
  canTransition,
  allowedTransitions,
  isMoneyTransition,
} from "./lib/dealStateMachine.ts";

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

// ---- Caminho principal completo ----

const fullPath = [
  "LEAD", "QUEUED", "AGENT_ASSIGNED", "QUALIFYING", "FEES_PENDING",
  "VISIT_SCHEDULED", "VISIT_DONE", "RELATORIO_SOLICITADO", "DUE_DILIGENCE",
  "REPORT_DELIVERED", "NEGOTIATING", "AGREED", "DEPOSIT_PENDING",
  "DEPOSIT_PAID", "ACT_SCHEDULED", "ACT_IN_PROGRESS", "SETTLED", "CLOSED_WON",
];

check("caminho: sequência principal válida de topo",
  allowedTransitions("LEAD")[0] === "QUEUED"
  && allowedTransitions("VISIT_DONE")[0] === "RELATORIO_SOLICITADO"
  && allowedTransitions("RELATORIO_SOLICITADO")[0] === "DUE_DILIGENCE");

let okFlow = true;
for (let i = 0; i < fullPath.length - 1; i++) {
  const from = fullPath[i];
  const to = fullPath[i + 1];
  const guards = {};
  if (from === "AGREED") { guards.buyerOtpAt = true; guards.sellerOtpAt = true; }
  if (from === "DEPOSIT_PENDING") guards.depositPaid = true;
  if (from === "ACT_SCHEDULED") guards.balancePaid = true;
  if (from === "ACT_IN_PROGRESS") guards.sellerReceiptConfirmedAt = true;
  if (from === "SETTLED") guards.handoverConfirmed = true;
  if (!canTransition(from, to, guards).ok) okFlow = false;
}
check("caminho: todo o fluxo principal avança com guards preenchidos", okFlow);

// ---- Guards de dinheiro ----

check("guard: AGREED→DEPOSIT_PENDING exige OTPs",
  canTransition("AGREED", "DEPOSIT_PENDING", {}).missingGuards.sort().join(",") === "buyerOtpAt,sellerOtpAt");
check("guard: DEPOSIT_PENDING→DEPOSIT_PAID exige depósito pago",
  !canTransition("DEPOSIT_PENDING", "DEPOSIT_PAID", {}).ok);
check("guard: ACT_IN_PROGRESS→SETTLED exige confirmação do VENDEDOR",
  canTransition("ACT_IN_PROGRESS", "SETTLED", {}).missingGuards.includes("sellerReceiptConfirmedAt"));
check("guard: SETTLED→CLOSED_WON exige entrega confirmada",
  canTransition("SETTLED", "CLOSED_WON", {}).missingGuards.includes("handoverConfirmed"));
check("guard: REEMBOLSO_PENDENTE→REEMBOLSO_CONCLUIDO exige liquidação bancária",
  canTransition("REEMBOLSO_PENDENTE", "REEMBOLSO_CONCLUIDO", {}).missingGuards.includes("refundSettled"));
check("guard: isMoneyTransition marca as de dinheiro",
  isMoneyTransition("ACT_IN_PROGRESS", "SETTLED")
  && isMoneyTransition("REEMBOLSO_PENDENTE", "REEMBOLSO_CONCLUIDO")
  && !isMoneyTransition("VISIT_DONE", "RELATORIO_SOLICITADO"));

// ---- Transições inválidas / saltos proibidos ----

check("salto: NEGOTIATING→DEPOSIT_PAID proibido",
  !canTransition("NEGOTIATING", "DEPOSIT_PAID", {}).ok);
check("salto: LEAD→AGREED proibido",
  !canTransition("LEAD", "AGREED", {}).ok);
check("salto: VISIT_DONE→REPORT_DELIVERED proibido (falta relatório/diligência)",
  !canTransition("VISIT_DONE", "REPORT_DELIVERED", {}).ok);
check("salto: estado terminal não avança", canTransition("CLOSED_WON", "DEPOSIT_PAID", {}).ok === false);

// ---- Estados de exceção v3 ----

check("exceção: DUE_DILIGENCE→CLOSED_LOST permitido",
  canTransition("DUE_DILIGENCE", "CLOSED_LOST", {}).ok);
check("exceção: NEGOTIATING→SELLER_WITHDREW permitido",
  canTransition("NEGOTIATING", "SELLER_WITHDREW", {}).ok);
check("exceção: ACT_IN_PROGRESS→DISPUTED permitido",
  canTransition("ACT_IN_PROGRESS", "DISPUTED", {}).ok);
check("exceção: sem guard nos estados sem dinheiro",
  allowedTransitions("DEPOSIT_PENDING").includes("EXPIRED_UNPAID")
  && canTransition("DEPOSIT_PENDING", "EXPIRED_UNPAID", {}).ok);

// ---- Bloqueios v3 ----

check("v3: AGREED pode ser bloqueado por documentos",
  canTransition("AGREED", "BLOQUEADO_POR_DOCUMENTOS", {}).ok);
check("v3: qualquer estado aberto pode ir a RISCO",
  canTransition("REPORT_DELIVERED", "BLOQUEADO_POR_RISCO", {}).ok
  && canTransition("DEPOSIT_PAID", "BLOQUEADO_POR_RISCO", {}).ok);
check("v3: BLOQUEADO_POR_DOCUMENTOS volta só p/ DUE_DILIGENCE",
  allowedTransitions("BLOQUEADO_POR_DOCUMENTOS").join(",") === "DUE_DILIGENCE");
check("v3: BLOQUEADO_POR_DOCUMENTOS não herda exit genérico",
  !allowedTransitions("BLOQUEADO_POR_DOCUMENTOS").includes("REEMBOLSO_PENDENTE"));
check("v3: BLOQUEADO_POR_RISCO vai para fraude (nunca apaga provas)",
  allowedTransitions("BLOQUEADO_POR_RISCO").join(",") === "FRAUDE_EM_INVESTIGACAO");
check("v3: SUSPENSO tem saídas controladas",
  allowedTransitions("SUSPENSO").includes("REEMBOLSO_PENDENTE")
  && allowedTransitions("SUSPENSO").includes("SELLER_WITHDREW")
  && allowedTransitions("SUSPENSO").length === 4);
check("v3: FRAUDE_EM_INVESTIGACAO é terminal",
  allowedTransitions("FRAUDE_EM_INVESTIGACAO").length === 0);
check("v3: REEMBOLSO_PENDENTE só resolve p/ CONCLUIDO ou DISPUTED",
  allowedTransitions("REEMBOLSO_PENDENTE").sort().join(",") === "DISPUTED,REEMBOLSO_CONCLUIDO");
check("v3: REEMBOLSO_CONCLUIDO é terminal",
  allowedTransitions("REEMBOLSO_CONCLUIDO").length === 0);
check("v3: FRAUDE não pode entrar em REEMBOLSO (investigação primeiro)",
  !allowedTransitions("FRAUDE_EM_INVESTIGACAO").includes("REEMBOLSO_PENDENTE"));

// ---- Vista disponível a partir de cada estado ----

check("matriz: AGREED oferece DEPOSIT_PENDING + exceções",
  allowedTransitions("AGREED").includes("DEPOSIT_PENDING")
  && allowedTransitions("AGREED").includes("SELLER_WITHDREW")
  && allowedTransitions("AGREED").includes("BUYER_WITHDREW")
  && allowedTransitions("AGREED").includes("DISPUTED")
  && allowedTransitions("AGREED").includes("CLOSED_LOST")
  && allowedTransitions("AGREED").includes("BLOQUEADO_POR_RISCO"));
check("matriz: estados terminais sem saída",
  allowedTransitions("CLOSED_WON").length === 0
  && allowedTransitions("DISPUTED").length === 0
  && allowedTransitions("REEMBOLSO_CONCLUIDO").length === 0);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);