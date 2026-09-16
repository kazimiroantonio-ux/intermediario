// ---------------------------------------------------------------------------
// (Prioridade 5) Pagamentos/reconciliação — ciclo da spec v3 (10 estados).
// Sem BD: os 10 estados mapeiam para o enum atual do schema (`PAYMENT_DB_MAP`),
// para as rotas persistirem sem migração. Deterministica e pura.
// Estados: CRIADO → AGUARDA_PAGAMENTO → INICIADO → PENDENTE_NO_BANCO → RECEBIDO
//          → RECONCILIADO → REEMBOLSO_PENDENTE → REEMBOLSADO
//          (FALHOU / CANCELADO terminam; nunca depois de RECEBIDO).
// ---------------------------------------------------------------------------

import { can } from "./accessPolicy.ts";
import type { WorkQueueItem, QueuePriority } from "./workQueue.ts";
import { createQueueItem } from "./workQueue.ts";

export type PaymentPhase =
  | "CRIADO"
  | "AGUARDA_PAGAMENTO"
  | "INICIADO"
  | "PENDENTE_NO_BANCO"
  | "RECEBIDO"
  | "RECONCILIADO"
  | "FALHOU"
  | "CANCELADO"
  | "REEMBOLSO_PENDENTE"
  | "REEMBOLSADO";

export interface PaymentEvent {
  type: string;
  actorId: string;
  actorRole: string;
  atIso: string;
  payload?: Record<string, unknown>;
}

export interface Payment {
  id: string;
  dealId: string;
  commissionId?: string;
  description: string;
  amountCents: bigint;
  currency: "AOA";
  phase: PaymentPhase;
  clientId?: string;
  agency?: string; // exemplo: "MULTICAIXA", "BAI", "SNBA"
  externalRef?: string; // id/external ref da transação no banco
  method?: string;
  receivedAt?: string;
  reconciledById?: string;
  reconciledAt?: string;
  refundId?: string;
  dueIso?: string;
  createdAtIso: string;
  updatedAtIso: string;
  events: PaymentEvent[];
}

export interface PaymentResult {
  payment?: Payment;
  error?: string;
  events?: PaymentEvent[];
}

/** Persistência sem migração → enum atual do schema. */
export const PAYMENT_DB_MAP: Record<PaymentPhase, "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED"> = {
  CRIADO: "PENDING",
  AGUARDA_PAGAMENTO: "PENDING",
  INICIADO: "PENDING",
  PENDENTE_NO_BANCO: "PENDING",
  RECEBIDO: "APPROVED",
  RECONCILIADO: "APPROVED",
  FALHOU: "REJECTED",
  CANCELADO: "REJECTED",
  REEMBOLSO_PENDENTE: "REFUNDED",
  REEMBOLSADO: "REFUNDED",
};

const PHASE_TRANSITIONS: Record<PaymentPhase, readonly PaymentPhase[]> = {
  CRIADO: ["AGUARDA_PAGAMENTO", "CANCELADO"],
  AGUARDA_PAGAMENTO: ["INICIADO", "RECEBIDO", "FALHOU", "CANCELADO"],
  INICIADO: ["PENDENTE_NO_BANCO", "RECEBIDO", "FALHOU", "CANCELADO"],
  PENDENTE_NO_BANCO: ["RECEBIDO", "FALHOU"],
  RECEBIDO: ["RECONCILIADO"],
  RECONCILIADO: ["REEMBOLSO_PENDENTE"],
  REEMBOLSO_PENDENTE: ["REEMBOLSADO"],
  FALHOU: [],
  CANCELADO: [],
  REEMBOLSADO: [],
};

export function canPhaseTransition(from: PaymentPhase, to: PaymentPhase): boolean {
  return PHASE_TRANSITIONS[from].includes(to);
}

function ev(type: string, actorId: string, actorRole: string, nowIso: string, payload?: Record<string, unknown>): PaymentEvent {
  return { type, actorId, actorRole, atIso: nowIso, payload };
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

/** 1) Obrigação criada — valor travado em cêntimos de Kz (nunca muda depois). */
export function createPayment(input: {
  id: string;
  dealId: string;
  commissionId?: string;
  description: string;
  amountCents: bigint;
  clientId?: string;
  dueIso?: string;
  actorId: string;
  actorRole: string;
  nowIso?: string;
}): PaymentResult {
  if (input.amountCents <= 0n) return { error: "Valor de pagamento inválido." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const payment: Payment = {
    id: input.id,
    dealId: input.dealId,
    commissionId: input.commissionId,
    description: input.description.trim() || "Comissão O Intermediário",
    amountCents: input.amountCents,
    currency: "AOA",
    phase: "CRIADO",
    clientId: input.clientId,
    dueIso: input.dueIso,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    events: [ev("PAYMENT_CREATED", input.actorId, input.actorRole, nowIso, { amountCents: input.amountCents.toString() })],
  };
  return { payment };
}

/** 2) Enviar pedido de pagamento — entra em AGUARDA_PAGAMENTO com prazo. */
export function schedulePayment(
  p: Payment,
  input: { actorId: string; actorRole: string; dueDays?: number; nowIso?: string }
): PaymentResult {
  if (p.phase !== "CRIADO") return { payment: p, error: `Só pagamentos criados são agendados (estado: ${p.phase}).` };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const dueIso = p.dueIso ?? new Date(new Date(nowIso).getTime() + (input.dueDays ?? 3) * 86_400_000).toISOString();
  const e = ev("PAYMENT_SCHEDULED", input.actorId, input.actorRole, nowIso, { dueIso });
  return { payment: { ...p, phase: "AGUARDA_PAGAMENTO", dueIso, updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 3) Cliente inicia a sessão no banco. */
export function startPayment(
  p: Payment,
  input: { clientId: string; method: string; agency: string; nowIso?: string }
): PaymentResult {
  if (p.phase !== "AGUARDA_PAGAMENTO") return { payment: p, error: `Só pagamentos agendados iniciam (estado: ${p.phase}).` };
  if (!input.method.trim() || !input.agency.trim()) return { payment: p, error: "Método e agência obrigatórios." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("PAYMENT_STARTED", input.clientId, "CLIENT", nowIso, { method: input.method, agency: input.agency });
  return { payment: { ...p, phase: "INICIADO", clientId: input.clientId, method: input.method.trim(), agency: input.agency.trim(), updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 4) Banco comunica a transação; o pagamento fica à espera do callback. */
export function markPendingBank(
  p: Payment,
  input: { agency: string; externalRef: string; nowIso?: string; actorId?: string }
): PaymentResult {
  if (p.phase !== "INICIADO") return { payment: p, error: `Só pagamentos iniciados ficam pendentes no banco (estado: ${p.phase}).` };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("PAYMENT_AT_BANK", input.actorId ?? "bank", "PROVIDER", nowIso, { externalRef: input.externalRef });
  return { payment: { ...p, phase: "PENDENTE_NO_BANCO", externalRef: input.externalRef.trim(), updatedAtIso: nowIso, events: [...p.events, e] } };
}

/**
 * 5) Confirmação pelo canal (webhook/callback). Só migra para RECEBIDO se o
 * valor bater exatamente; divergência → FALHOU com razão e evento (a fila
 * divergence valors apanha). Dedupe: repetição após RECEBIDO é recusada.
 */
export function confirmPayment(
  p: Payment,
  input: { gatewayId: string; amountCents: bigint; paidAt?: string; nowIso?: string; agency?: string }
): PaymentResult {
  const terminal = p.phase === "FALHOU" || p.phase === "CANCELADO" || p.phase === "REEMBOLSADO";
  if (terminal) return { payment: p, error: `Pagamento em estado final (${p.phase}).` };
  if (!["AGUARDA_PAGAMENTO", "INICIADO", "PENDENTE_NO_BANCO", "RECEBIDO", "RECONCILIADO"].includes(p.phase)) {
    return { payment: p, error: `Confirmação não permitida em ${p.phase}.` };
  }
  if (p.phase === "RECEBIDO" || p.phase === "RECONCILIADO") {
    return { payment: p, error: "Pagamento já recebido; confirmação duplicada recusada." };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (input.amountCents !== p.amountCents) {
    const e = ev("PAYMENT_MISMATCH", input.agency ?? "bank", "PROVIDER", nowIso, {
      got: input.amountCents.toString(),
      expected: p.amountCents.toString(),
      reason: "Valor não coincide com a obrigação.",
    });
    return { payment: { ...p, phase: "FALHOU", externalRef: input.gatewayId.trim(), updatedAtIso: nowIso, events: [...p.events, e] }, events: [e] };
  }
  const e = ev("PAYMENT_CONFIRMED", input.gatewayId, "PROVIDER", nowIso, { paidAt: input.paidAt });
  return { payment: { ...p, phase: "RECEBIDO", externalRef: input.gatewayId.trim(), receivedAt: input.paidAt ?? nowIso, updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 6) Desistência/falha da sessão bancária antes de qualquer recebimento. */
export function failPayment(
  p: Payment,
  input: { actorId: string; actorRole: string; reason: string; nowIso?: string }
): PaymentResult {
  if (!["AGUARDA_PAGAMENTO", "INICIADO", "PENDENTE_NO_BANCO"].includes(p.phase)) {
    return { payment: p, error: `Não se pode falhar um pagamento em ${p.phase}.` };
  }
  if (!input.reason.trim()) return { payment: p, error: "Razão da falha obrigatória." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("PAYMENT_FAILED", input.actorId, input.actorRole, nowIso, { reason: input.reason.trim() });
  return { payment: { ...p, phase: "FALHOU", updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** Cancelamento apenas enquanto não há dinheiro recebido. */
export function cancelPayment(
  p: Payment,
  input: { actorId: string; actorRole: string; note?: string; nowIso?: string }
): PaymentResult {
  if (!["CRIADO", "AGUARDA_PAGAMENTO", "INICIADO", "PENDENTE_NO_BANCO"].includes(p.phase)) {
    return { payment: p, error: `Dinheiro recebido (${p.phase}) — tratar por reembolso, não cancelamento.` };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("PAYMENT_CANCELLED", input.actorId, input.actorRole, nowIso, { note: input.note });
  return { payment: { ...p, phase: "CANCELADO", updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 7) Reconciliação financeira — só quem tem `payments.reconcile` e valor certo. */
export function reconcilePayment(
  p: Payment,
  input: { operatorId: string; operatorRole: string; externalRef: string; amountCents: bigint; nowIso?: string }
): PaymentResult {
  if (p.phase !== "RECEBIDO") return { payment: p, error: `Só pagamentos recebidos reconciliam (estado: ${p.phase}).` };
  if (input.amountCents !== p.amountCents) {
    return { payment: p, error: `Divergência de valores (esperado ${p.amountCents.toString()} Kz).` };
  }
  const authorized = can({ operatorRole: input.operatorRole as never }, "payments", "reconcile");
  if (!authorized.allowed) return { payment: p, error: authorized.reason ?? "Sem permissão para reconciliar." };
  if (!input.externalRef.trim()) return { payment: p, error: "Referência de reconciliação obrigatória." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("PAYMENT_RECONCILED", input.operatorId, input.operatorRole, nowIso, { externalRef: input.externalRef.trim() });
  return { payment: { ...p, phase: "RECONCILIADO", externalRef: input.externalRef.trim(), reconciledById: input.operatorId, reconciledAt: nowIso, updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 8) Reembolso ligado ao pagamento (o fluxo de reembolso gere os detalhes). */
export function linkRefund(
  p: Payment,
  input: { refundId: string; operatorId: string; operatorRole: string; nowIso?: string }
): PaymentResult {
  if (p.phase !== "RECONCILIADO") return { payment: p, error: `Só pagamentos reconciliados entram em reembolso (estado: ${p.phase}).` };
  const authorized = can({ operatorRole: input.operatorRole as never }, "payments", "reconcile");
  if (!authorized.allowed) return { payment: p, error: authorized.reason ?? "Sem permissão para abrir reembolso." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("REFUND_LINKED", input.operatorId, input.operatorRole, nowIso, { refundId: input.refundId });
  return { payment: { ...p, phase: "REEMBOLSO_PENDENTE", refundId: input.refundId, updatedAtIso: nowIso, events: [...p.events, e] } };
}

/** 9) Reembolso liquidado (a prova é a referência — nunca um print). */
export function settleRefundPayment(
  p: Payment,
  input: { operatorId: string; operatorRole: string; externalRef: string; nowIso?: string }
): PaymentResult {
  if (p.phase !== "REEMBOLSO_PENDENTE") return { payment: p, error: `Só reembolsos pendentes liquidam (estado: ${p.phase}).` };
  const authorized = can({ operatorRole: input.operatorRole as never }, "payments", "reconcile");
  if (!authorized.allowed) return { payment: p, error: authorized.reason ?? "Sem permissão para liquidar reembolso." };
  if (!input.externalRef.trim()) return { payment: p, error: "Referência bancária obrigatória." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const e = ev("REFUND_SETTLED", input.operatorId, input.operatorRole, nowIso, { externalRef: input.externalRef.trim() });
  return { payment: { ...p, phase: "REEMBOLSADO", externalRef: input.externalRef.trim(), updatedAtIso: nowIso, events: [...p.events, e] } };
}

// ---------------------------------------------------------------------------
// Reconciliação com o extrato do banco
// ---------------------------------------------------------------------------

export interface StatementLine {
  lineId: string;
  amountCents: bigint;
  ref?: string;
  dateIso?: string;
}

export interface ReconciliationOutcome {
  matched: { paymentId: string; lineId: string }[];
  unmatchedLines: StatementLine[];
  mismatches: { paymentId?: string; lineId?: string; reason: string }[];
}

/** Cruza pagamentos RECEBIDO com o extrato; divergência → pedido de revisão. */
export function matchStatement(payments: Payment[], lines: StatementLine[]): ReconciliationOutcome {
  const matched: { paymentId: string; lineId: string }[] = [];
  const mismatches: { paymentId?: string; lineId?: string; reason: string }[] = [];
  const restantes = [...lines.filter((l) => l.amountCents > 0n)];

  for (const p of payments.filter((x) => x.phase === "RECEBIDO")) {
    const idx = restantes.findIndex(
      (l) => l.amountCents === p.amountCents && (!l.ref || !p.externalRef || l.ref === p.externalRef)
    );
    if (idx >= 0) {
      matched.push({ paymentId: p.id, lineId: restantes[idx].lineId });
      restantes.splice(idx, 1);
    } else {
      mismatches.push({ paymentId: p.id, reason: `Pagamento ${p.id} sem linha correspondente no extrato.` });
    }
  }
  return { matched, unmatchedLines: restantes, mismatches };
}

// ---------------------------------------------------------------------------
// Prazo / escalamento do pagamento
// ---------------------------------------------------------------------------

export interface PaymentDeadline {
  escalated: boolean;
  level: 0 | 1 | 2;
  nextStep?: string;
  warning?: string;
}

export function checkPaymentDeadline(p: Payment, nowIso: string): PaymentDeadline {
  if (["CRIADO", "AGUARDA_PAGAMENTO"].includes(p.phase) && p.dueIso) {
    if (nowIso >= p.dueIso) {
      return { escalated: true, level: 1, nextStep: "Lembrar o cliente (notificação) e reenviar pedido.", warning: "Pagamento em atraso." };
    }
    return { escalated: false, level: 0 };
  }
  if (p.phase === "RECEBIDO") {
    const wait = 2 * 86_400_000;
    const received = new Date(p.receivedAt ?? p.updatedAtIso).getTime();
    if (new Date(nowIso).getTime() - received > wait) {
      return { escalated: true, level: 1, nextStep: "Reconciliar com o extrato (fila financeira).", warning: "Recebido mas não reconciliado em 48h." };
    }
    return { escalated: false, level: 0 };
  }
  return { escalated: false, level: 0 };
}

// ---------------------------------------------------------------------------
// Fila financeira
// ---------------------------------------------------------------------------

export function paymentToQueueItem(p: Payment, nowIso: string, id?: string): { item?: WorkQueueItem; error?: string } {
  if (["RECONCILIADO", "REEMBOLSO_PENDENTE", "REEMBOLSADO", "CANCELADO"].includes(p.phase)) return { item: undefined };
  const overdue = checkPaymentDeadline(p, nowIso).escalated;
  const category =
    p.phase === "RECEBIDO" ? "pagamento.nao_reconciliado"
    : p.phase === "FALHOU" || p.phase === "INICIADO"? "divergencia.valores"
    : "pagamento.pendente";
  const priority: QueuePriority = overdue || p.phase === "RECEBIDO" || p.phase === "FALHOU" ? "ALTA" : "MEDIA";
  const nextStep =
    p.phase === "RECEBIDO" ? "Reconciliar com o extrato."
    : p.phase === "FALHOU" ? "Marcar divergência e contactar o banco."
    : "Lembrar o cliente do pedido de pagamento.";
  return createQueueItem({
    id: id ?? p.id,
    queue: "FINANCIAL",
    category,
    entityType: "DEAL",
    subjectId: p.dealId,
    priority,
    nextStep,
    actorId: "system.workqueue",
    nowIso,
  });
}