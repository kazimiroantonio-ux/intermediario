// ---------------------------------------------------------------------------
// (Prioridade 9) Suporte e disputas — ticket com SLA/escalamento/resposta e
// disputa de negócio que bloqueia o avanço até resolução (gate deal).
// Determinístico; integra-se às filas SUPPORT via adaptador e emite outbox.
// ---------------------------------------------------------------------------

import type { WorkQueueItem } from "./workQueue.ts";
import { createQueueItem } from "./workQueue.ts";

export type TicketPriority = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
export type TicketStatus = "NOVO" | "EM_ANALISE" | "AGUARDANDO_CLIENTE" | "EM_RESOLUCAO" | "RESOLVIDO" | "ESCALADO" | "FECHADO";

export interface TicketMessage {
  id: string;
  byId: string;
  role: "CLIENT" | "SUPPORT" | "SYSTEM";
  body: string;
  atIso: string;
}

export interface SupportTicket {
  id: string;
  dealId?: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId?: string;
  messages: TicketMessage[];
  raisedAtIso: string;
  lastReplyAtIso: string;
  deadlineIso: string;
  escalateLevel: 0 | 1 | 2;
  resolutionNote?: string;
  closedReason?: string;
  disputeId?: string;
}

export interface TicketResult {
  ticket?: SupportTicket;
  error?: string;
  outbox?: Array<{ type: string; ticketId: string; atIso: string; payload?: Record<string, unknown> }>;
}

export interface Dispute {
  id: string;
  dealId: string;
  openedById: string;
  openedByRole: string;
  amountCents: bigint;
  reason: string;
  status: "ABERTA" | "EM_ANALISE" | "RESOLVIDA" | "RECUSADA";
  decidedById?: string;
  decidedNote?: string;
  decidedAtIso?: string;
  blocks: boolean; // bloqueio ativo do negócio
  createdAtIso: string;
  updatedAtIso: string;
}

export interface DisputeResult {
  dispute?: Dispute;
  error?: string;
  outbox?: Array<{ type: string; disputeId: string; dealId: string; atIso: string }>;
}

export const TICKET_SLA_MINUTES: Record<TicketPriority, number> = { BAIXA: 4320, MEDIA: 1440, ALTA: 720, URGENTE: 240 };

const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NOVO: ["EM_ANALISE", "AGUARDANDO_CLIENTE", "RESOLVIDO", "ESCALADO"],
  EM_ANALISE: ["AGUARDANDO_CLIENTE", "EM_RESOLUCAO", "RESOLVIDO", "ESCALADO", "FECHADO"],
  AGUARDANDO_CLIENTE: ["EM_ANALISE", "RESOLVIDO", "FECHADO"],
  EM_RESOLUCAO: ["AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"],
  RESOLVIDO: ["FECHADO"],
  ESCALADO: ["EM_ANALISE", "AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"],
  FECHADO: [],
};

function addMin(iso: string, m: number): string {
  return new Date(new Date(iso).getTime() + m * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export function openTicket(input: {
  id: string;
  subject: string;
  body: string;
  dealId?: string;
  priority?: TicketPriority;
  byId: string;
  nowIso?: string;
}): TicketResult {
  if (!input.subject.trim() || !input.body.trim()) return { error: "Assunto e mensagem obrigatórios." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const priority = input.priority ?? "MEDIA";
  const ticket: SupportTicket = {
    id: input.id,
    dealId: input.dealId,
    subject: input.subject.trim(),
    priority,
    status: "NOVO",
    messages: [{ id: `${input.id}:m1`, byId: input.byId, role: "CLIENT", body: input.body.trim(), atIso: nowIso }],
    raisedAtIso: nowIso,
    lastReplyAtIso: nowIso,
    deadlineIso: addMin(nowIso, TICKET_SLA_MINUTES[priority]),
    escalateLevel: 0,
  };
  return { ticket, outbox: [{ type: "TICKET_OPENED", ticketId: input.id, atIso: nowIso }] };
}

export function assignTicket(ticket: SupportTicket, input: { assigneeId: string; byId: string; nowIso?: string }): TicketResult {
  if (ticket.status === "FECHADO") return { ticket, error: "Ticket fechado não é atribuível." };
  if (ticket.assigneeId && ticket.assigneeId !== input.assigneeId) return { ticket, error: "Já tem responsável." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  return { ticket: { ...ticket, assigneeId: input.assigneeId, status: "EM_ANALISE", lastReplyAtIso: nowIso } };
}

export function replyToTicket(
  ticket: SupportTicket,
  input: { byId: string; role: "CLIENT" | "SUPPORT" | "SYSTEM"; body: string; nowIso?: string }
): TicketResult {
  if (ticket.status === "FECHADO") return { ticket, error: "Ticket fechado não aceita mensagens." };
  if (!input.body.trim()) return { ticket, error: "Mensagem vazia." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const status: TicketStatus =
    input.role === "CLIENT" ? "AGUARDANDO_CLIENTE"
    : ticket.status === "AGUARDANDO_CLIENTE" || ticket.status === "NOVO" ? "EM_ANALISE"
    : ticket.status;
  return {
    ticket: {
      ...ticket,
      status,
      messages: [...ticket.messages, { id: `${ticket.id}:m${ticket.messages.length + 1}`, byId: input.byId, role: input.role, body: input.body.trim(), atIso: nowIso }],
      lastReplyAtIso: nowIso,
    },
  };
}

export function transitionTicket(ticket: SupportTicket, input: { to: TicketStatus; byId: string; nowIso?: string }): TicketResult {
  if (!TICKET_TRANSITIONS[ticket.status].includes(input.to)) {
    return { ticket, error: `Transição ${ticket.status}→${input.to} não permitida.` };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (input.to === "RESOLVIDO" || input.to === "FECHADO") {
    return { ticket, error: "Resolver/fechar exige nota ou motivo explícito." };
  }
  return { ticket: { ...ticket, status: input.to, lastReplyAtIso: nowIso } };
}

export function resolveTicket(ticket: SupportTicket, input: { byId: string; note: string; nowIso?: string }): TicketResult {
  if (ticket.status === "FECHADO") return { ticket, error: "Ticket já fechado." };
  if (!input.note.trim()) return { ticket, error: "A resolução exige nota." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  return { ticket: { ...ticket, status: "RESOLVIDO", resolutionNote: input.note.trim(), lastReplyAtIso: nowIso } };
}

export function closeTicket(ticket: SupportTicket, input: { byId: string; reason: string; nowIso?: string }): TicketResult {
  if (ticket.status !== "RESOLVIDO") return { ticket, error: "Só tickets resolvidos são fechados." };
  if (!input.reason.trim()) return { ticket, error: "O fecho exige o motivo." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  return { ticket: { ...ticket, status: "FECHADO", closedReason: input.reason.trim(), lastReplyAtIso: nowIso } };
}

export function escalateTicket(ticket: SupportTicket, input: { byId: string; reason: string; nowIso?: string }): TicketResult {
  if (ticket.status === "FECHADO") return { ticket, error: "Fechado não escala." };
  if (!input.reason.trim()) return { ticket, error: "O escalamento exige o motivo." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    ticket: {
      ...ticket,
      status: "ESCALADO",
      escalateLevel: Math.min(ticket.escalateLevel + 1, 2) as 0 | 1 | 2,
      priority: "URGENTE",
      deadlineIso: addMin(nowIso, TICKET_SLA_MINUTES.URGENTE),
      lastReplyAtIso: nowIso,
      messages: [...ticket.messages, { id: `${ticket.id}:m${ticket.messages.length + 1}`, byId: input.byId, role: "SYSTEM", body: `ESCALADO: ${input.reason.trim()}`, atIso: nowIso }],
    },
  };
}

export function ticketOverdue(ticket: SupportTicket, nowIso: string): { overdue: boolean; reason?: string } {
  if (ticket.status === "FECHADO" || ticket.status === "RESOLVIDO") return { overdue: false };
  if (nowIso >= ticket.deadlineIso) return { overdue: true, reason: `Ticket ${ticket.id} ultrapassou o prazo (${ticket.deadlineIso}).` };
  return { overdue: false };
}

// ---------------------------------------------------------------------------
// Disputas (bloqueiam o negócio)
// ---------------------------------------------------------------------------

export function openDispute(input: {
  id: string;
  dealId: string;
  openedById: string;
  openedByRole: string;
  amountCents: bigint;
  reason: string;
  nowIso?: string;
}): DisputeResult {
  if (!input.reason.trim()) return { error: "A disputa exige o motivo." };
  if (input.amountCents <= 0n) return { error: "Valor contestado inválido." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const dispute: Dispute = {
    id: input.id,
    dealId: input.dealId,
    openedById: input.openedById,
    openedByRole: input.openedByRole,
    amountCents: input.amountCents,
    reason: input.reason.trim(),
    status: "ABERTA",
    blocks: true,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
  return { dispute, outbox: [{ type: "DISPUTE_OPENED", disputeId: input.id, dealId: input.dealId, atIso: nowIso }] };
}

/** Decisão — resolve (desbloqueia) ou recusa (segue com a nota registada). */
export function decideDispute(
  dispute: Dispute,
  input: { byId: string; decide: boolean; note: string; nowIso?: string }
): DisputeResult {
  if (dispute.status === "RESOLVIDA" || dispute.status === "RECUSADA") return { dispute, error: "Disputa já decidida." };
  if (!input.note.trim()) return { dispute, error: "A decisão exige a nota." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const next: Dispute = {
    ...dispute,
    status: input.decide ? "RESOLVIDA" : "RECUSADA",
    blocks: false,
    decidedById: input.byId,
    decidedNote: input.note.trim(),
    decidedAtIso: nowIso,
    updatedAtIso: nowIso,
  };
  return { dispute: next, outbox: [{ type: input.decide ? "DISPUTE_RESOLVED" : "DISPUTE_REFUSED", disputeId: dispute.id, dealId: dispute.dealId, atIso: nowIso }] };
}

/** Gate do negócio: disputa aberta bloqueia transições (a state machine consulta). */
export function dealBlockedByDispute(dispute?: Dispute): boolean {
  return dispute !== undefined && dispute.blocks && dispute.status === "ABERTA";
}

// ---------------------------------------------------------------------------
// Adaptador para a fila SUPPORT
// ---------------------------------------------------------------------------

export function ticketToQueueItem(ticket: SupportTicket, nowIso: string, id?: string): { item?: WorkQueueItem; error?: string } {
  if (ticket.status === "FECHADO" || ticket.status === "RESOLVIDO") return { item: undefined };
  const category = ticket.priority === "URGENTE" || ticket.status === "ESCALADO" ? "prazo.ultrapassado"
    : ticket.subject.toLowerCase().includes("reclama") || ticket.subject.toLowerCase().includes("queixa") ? "reclamacao"
    : "pedido.novo";
  return createQueueItem({
    id: id ?? ticket.id,
    queue: "SUPPORT",
    category,
    entityType: "TICKET",
    subjectId: ticket.id,
    priority: ticket.priority === "URGENTE" || ticket.priority === "ALTA" ? "ALTA" : ticket.priority === "BAIXA" ? "BAIXA" : "MEDIA",
    nextStep: ticket.assigneeId ? "Continuar tratamento." : "Atribuir responsável.",
    actorId: "system.workqueue",
    nowIso,
  });
}