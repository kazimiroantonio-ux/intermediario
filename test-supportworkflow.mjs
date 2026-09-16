// Testes de suporte e disputas (spec v3 — prioridade 9).
// Correr: node --experimental-strip-types test-supportworkflow.mjs

import {
  openTicket,
  assignTicket,
  replyToTicket,
  transitionTicket,
  resolveTicket,
  closeTicket,
  escalateTicket,
  ticketOverdue,
  openDispute,
  decideDispute,
  dealBlockedByDispute,
  ticketToQueueItem,
  TICKET_SLA_MINUTES,
} from "./lib/supportWorkflow.ts";

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
const addMin = (iso, m) => new Date(new Date(iso).getTime() + m * 60_000).toISOString();

// ---- Ticket ----
const t = openTicket({ id: "t1", subject: "Pagamento duplicado", body: "Fui cobrado duas vezes.", dealId: "d1", priority: "ALTA", byId: "u9", nowIso: NOW });
check("abrir → NOVO com SLA ALTA e mensagem do cliente",
  t.ticket.status === "NOVO" && t.ticket.deadlineIso === addMin(NOW, TICKET_SLA_MINUTES.ALTA)
  && t.ticket.messages[0].role === "CLIENT" && t.outbox?.[0].type === "TICKET_OPENED");
check("assunto/mensagem vazios → recusa",
  openTicket({ id: "tx", subject: "  ", body: "x", byId: "u9", nowIso: NOW }).error !== undefined
  && openTicket({ id: "ty", subject: "x", body: "  ", byId: "u9", nowIso: NOW }).error !== undefined);

const atrib = assignTicket(t.ticket, { assigneeId: "op-sup1", byId: "supervisor", nowIso: NOW });
check("atribuir → EM_ANALISE com responsável",
  atrib.ticket.status === "EM_ANALISE" && atrib.ticket.assigneeId === "op-sup1");
check("trocar responsável → recusa",
  assignTicket(atrib.ticket, { assigneeId: "op-sup2", byId: "supervisor" }).error !== undefined);

const cli = replyToTicket(atrib.ticket, { byId: "u9", role: "CLIENT", body: "Segue o recibo.", nowIso: NOW });
check("resposta do cliente → AGUARDANDO_CLIENTE",
  cli.ticket.status === "AGUARDANDO_CLIENTE" && cli.ticket.messages.length === 2);
const sup = replyToTicket(cli.ticket, { byId: "op-sup1", role: "SUPPORT", body: "Vamos verificar.", nowIso: NOW });
check("resposta do suporte → volta a EM_ANALISE",
  sup.ticket.status === "EM_ANALISE");
check("mensagem vazia → recusa",
  replyToTicket(sup.ticket, { byId: "op-sup1", role: "SUPPORT", body: " ", nowIso: NOW }).error !== undefined);

check("transição ilegal NOVO→FECHADO → recusa",
  transitionTicket(t.ticket, { to: "FECHADO", byId: "supervisor" }).error !== undefined);
check("transição válida EM_ANALISE→EM_RESOLUCAO",
  transitionTicket(sup.ticket, { to: "EM_RESOLUCAO", byId: "op-sup1", nowIso: NOW }).ticket.status === "EM_RESOLUCAO");

check("resolver sem nota → recusa",
  resolveTicket(t.ticket, { byId: "op-sup1", note: "  ", nowIso: NOW }).error !== undefined);
const res = resolveTicket(sup.ticket, { byId: "op-sup1", note: "Reembolso processado.", nowIso: NOW });
check("resolver → RESOLVIDO com nota",
  res.ticket.status === "RESOLVIDO" && res.ticket.resolutionNote === "Reembolso processado.");
check("fechar sem resolver → recusa",
  closeTicket(t.ticket, { byId: "op-sup1", reason: "x", nowIso: NOW }).error !== undefined);
const fech = closeTicket(res.ticket, { byId: "op-sup1", reason: "Cliente confirmou.", nowIso: NOW });
check("fechar → FECHADO (terminal)",
  fech.ticket.status === "FECHADO" && closeTicket(fech.ticket, { byId: "op-sup1", reason: "x", nowIso: NOW }).error !== undefined);
check("terminal não aceita mensagens",
  replyToTicket(fech.ticket, { byId: "u9", role: "CLIENT", body: "x", nowIso: NOW }).error !== undefined);

// ---- Escalamento e prazos ----
const esc = escalateTicket(t.ticket, { byId: "op-sup2", reason: "2 dias sem resposta.", nowIso: NOW });
check("escalar → ESCALADO, URGENTE, nível 1 e mensagem SYSTEM",
  esc.ticket.status === "ESCALADO" && esc.ticket.priority === "URGENTE" && esc.ticket.escalateLevel === 1
  && esc.ticket.messages.at(-1).role === "SYSTEM");
check("escalar sem motivo → recusa",
  escalateTicket(t.ticket, { byId: "op-sup2", reason: " ", nowIso: NOW }).error !== undefined);
check("prazo excedido → overduetime",
  ticketOverdue(t.ticket, addMin(NOW, TICKET_SLA_MINUTES.ALTA + 1)).overdue === true);
check("resolvido/fechado não contam atrasos",
  ticketOverdue(res.ticket, "2030-01-01T00:00:00.000Z").overdue === false
  && ticketOverdue(fech.ticket, "2030-01-01T00:00:00.000Z").overdue === false);

// ---- Disputas bloqueiam o negócio ----
const disp = openDispute({ id: "dp1", dealId: "d1", openedById: "u9", openedByRole: "CLIENT", amountCents: 2_500_000n, reason: "Imóvel com defeito no contrato.", nowIso: NOW });
check("abrir disputa → ABERTA e bloqueia",
  disp.dispute.status === "ABERTA" && dealBlockedByDispute(disp.dispute) === true
  && disp.outbox?.[0].type === "DISPUTE_OPENED");
check("disputa sem motivo → recusa",
  openDispute({ id: "dp2", dealId: "d1", openedById: "u9", openedByRole: "CLIENT", amountCents: 1n, reason: " ", nowIso: NOW }).error !== undefined);

const decidida = decideDispute(disp.dispute, { byId: "op-sup1", decide: true, note: "Devolução aprovada.", nowIso: NOW });
check("resolver disputa → desbloqueia e regista decisão",
  decidida.dispute.status === "RESOLVIDA" && dealBlockedByDispute(decidida.dispute) === false
  && decidida.dispute.decidedNote === "Devolução aprovada."
  && decidida.outbox?.[0].type === "DISPUTE_RESOLVED");
check("decisão sem nota → recusa",
  decideDispute(disp.dispute, { byId: "op-sup1", decide: false, note: " ", nowIso: NOW }).error !== undefined);
check("dupla decisão → recusa",
  decideDispute(decidida.dispute, { byId: "op-sup1", decide: false, note: "x", nowIso: NOW }).error !== undefined);
check("recusada também desbloqueia",
  dealBlockedByDispute(decideDispute(disp.dispute, { byId: "op-sup1", decide: false, note: "Sem provas.", nowIso: NOW }).dispute) === false);

// ---- Fila SUPPORT ----
check("ticket novo de reclamação → fila reclamacao",
  ticketToQueueItem(openTicket({ id: "t2", subject: "Queixa do sinal", body: "Não devolveram o sinal.", dealId: "d2", byId: "u9", nowIso: NOW }).ticket, NOW, "w1").item?.category === "reclamacao");
check("ticket URGENTE → fila prazo.ultrapassado ALTA",
  ticketToQueueItem(esc.ticket, NOW, "w2").item?.category === "prazo.ultrapassado"
  && ticketToQueueItem(esc.ticket, NOW, "w2").item?.priority === "ALTA");
check("resolvido/fechado saem da fila",
  ticketToQueueItem(res.ticket, NOW, "w3").item === undefined
  && ticketToQueueItem(fech.ticket, NOW, "w4").item === undefined);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);