// ---------------------------------------------------------------------------
// Reembolsos (spec v3 sec. 8): pedido, causa, documento de suporte, aprovação
// (four-eyes), valor, método, prazo, comunicação e reconciliação.
// Reembolsos elevados exigem DUAS aprovações de funções diferentes; ninguém
// aprova o próprio pedido. Pagamento confirmado só com referência de
// reconciliação (nunca um print). Puro (sem Prisma) — estado imutável.
// Valores em cêntimos AOA (BigInt), como na BD.
// ---------------------------------------------------------------------------

import { can, validateFourEyes } from "./accessPolicy.ts";
import type { OperatorRoleName } from "./accessPolicy.ts";

export type RefundStatus =
  | "SOLICITADO"
  | "EM_APROVACAO"
  | "APROVADO"
  | "EM_PROCESSAMENTO"
  | "REEMBOLSADO"
  | "REJEITADO"
  | "CANCELADO";

/** Mapeamento direto para `RefundStatus` da BD (ligação futura). */
export const REFUND_DB_MAP: Record<RefundStatus, string> = {
  SOLICITADO: "REQUESTED",
  EM_APROVACAO: "EM_APROVACAO",
  APROVADO: "APPROVED",
  EM_PROCESSAMENTO: "EM_PROCESSAMENTO",
  REEMBOLSADO: "PAID",
  REJEITADO: "REJECTED",
  CANCELADO: "CANCELADO",
};

/** Acima deste valor (1.000.000 AOA = 100.000.000 cêntimos) → duas aprovações. */
export const HIGH_RISK_REFUND_CENTAVOS = 100_000_000n;
export const DEFAULT_REFUND_DEADLINE_DAYS = 5;

export interface RefundApproval {
  approverId: string;
  approverRole: OperatorRoleName;
  atIso: string;
}

export interface Refund {
  id: string;
  dealId: string;
  amountCents: bigint;
  currency: "AOA";
  reason: string;
  supportDocument?: string;
  status: RefundStatus;
  requestedById: string;
  requesterRole: OperatorRoleName;
  createdAtIso: string;
  deadlineIso: string;
  requiredApprovals: 1 | 2;
  approvals: RefundApproval[];
  method?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  settledRef?: string;
  proofUrl?: string;
  settledAtIso?: string;
}

export interface RefundResult {
  refund?: Refund;
  error?: string;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function asBigInt(value: bigint | string | number): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

/** 1) Pedido de reembolso com causa e (se aplicável) documento de suporte. */
export function requestRefund(input: {
  id: string;
  dealId: string;
  amountCents: bigint | string | number;
  reason: string;
  supportDocument?: string;
  requestedById: string;
  requesterRole: OperatorRoleName;
  /** Quanto do comprador já foi recebido (teto do reembolso). */
  maxRefundableCents?: bigint | string | number;
  nowIso?: string;
  deadlineDays?: number;
}): RefundResult {
  const amount = asBigInt(input.amountCents);
  if (amount <= 0n) {
    return { error: "Valor de reembolso inválido." };
  }
  if (!input.reason.trim()) {
    return { error: "É obrigatório indicar a causa do reembolso." };
  }
  if (input.maxRefundableCents !== undefined && amount > asBigInt(input.maxRefundableCents)) {
    return { error: "O reembolso não pode exceder o valor recebido do comprador." };
  }
  const authorized = can({ operatorRole: input.requesterRole }, "refunds", "create");
  if (!authorized.allowed) {
    return { error: authorized.reason ?? "Sem permissão para pedir reembolsos." };
  }

  const createdAtIso = input.nowIso ?? new Date().toISOString();
  const refund: Refund = {
    id: input.id,
    dealId: input.dealId,
    amountCents: amount,
    currency: "AOA",
    reason: input.reason.trim(),
    supportDocument: input.supportDocument,
    status: "SOLICITADO",
    requestedById: input.requestedById,
    requesterRole: input.requesterRole,
    createdAtIso,
    deadlineIso: addDays(createdAtIso, input.deadlineDays ?? DEFAULT_REFUND_DEADLINE_DAYS),
    requiredApprovals: amount >= HIGH_RISK_REFUND_CENTAVOS ? 2 : 1,
    approvals: [],
  };
  return { refund };
}

/** 2) Aprovação (four-eyes). Preenche até `requiredApprovals`; a última liberta. */
export function approveRefund(
  refund: Refund,
  input: { approverId: string; approverRole: OperatorRoleName; nowIso?: string }
): RefundResult {
  const authorized = can({ operatorRole: input.approverRole }, "refunds", "approve");
  if (!authorized.allowed) {
    return { refund, error: authorized.reason ?? "Sem permissão para aprovar reembolsos." };
  }
  const fe = validateFourEyes({
    requestedById: refund.requestedById,
    requesterRole: refund.requesterRole,
    approvedById: input.approverId,
    approverRole: input.approverRole,
    permission: "refunds.approve",
  });
  if (!fe.ok) return { refund, error: fe.reason };

  if (["REEMBOLSADO", "REJEITADO", "CANCELADO"].includes(refund.status)) {
    return { refund, error: `Não se aprova um reembolso ${refund.status.toLowerCase()}.` };
  }
  if (refund.approvals.some((a) => a.approverId === input.approverId)) {
    return { refund, error: "Este utilizador já aprovou o pedido." };
  }
  if (!(refund.requiredApprovals === 1 || refund.requiredApprovals === 2)) {
    return { refund, error: "Modelo de aprovação inválido." };
  }

  const approvals = [
    ...refund.approvals,
    { approverId: input.approverId, approverRole: input.approverRole, atIso: input.nowIso ?? new Date().toISOString() },
  ];
  const status: RefundStatus = approvals.length >= refund.requiredApprovals ? "APROVADO" : "EM_APROVACAO";
  return { refund: { ...refund, approvals, status } };
}

/** 3) Rejeição fundamentada (nunca pelo requerente — four-eyes). */
export function rejectRefund(
  refund: Refund,
  input: { approverId: string; approverRole: OperatorRoleName; reason: string; nowIso?: string }
): RefundResult {
  if (!["SOLICITADO", "EM_APROVACAO"].includes(refund.status)) {
    return { refund, error: `Não se rejeita um reembolso ${refund.status.toLowerCase()}.` };
  }
  if (!input.reason.trim()) {
    return { refund, error: "A rejeição exige o motivo." };
  }
  const authorized = can({ operatorRole: input.approverRole }, "refunds", "approve");
  if (!authorized.allowed) {
    return { refund, error: authorized.reason ?? "Sem permissão para rejeitar reembolsos." };
  }
  const fe = validateFourEyes({
    requestedById: refund.requestedById,
    requesterRole: refund.requesterRole,
    approvedById: input.approverId,
    approverRole: input.approverRole,
    permission: "refunds.approve",
  });
  if (!fe.ok) return { refund, error: fe.reason };

  return {
    refund: {
      ...refund,
      status: "REJEITADO",
      rejectedBy: input.approverId,
      rejectionReason: input.reason.trim(),
    },
  };
}

/** 4) Processamento — só financeiro mobiliza dinheiro. Exige método de reembolso. */
export function markProcessing(
  refund: Refund,
  input: { operatorId: string; operatorRole: OperatorRoleName; method: string; nowIso?: string }
): RefundResult {
  if (refund.status !== "APROVADO") {
    return { refund, error: `Só reembolsos aprovados entram em processamento (estado: ${refund.status}).` };
  }
  if (!input.method.trim()) {
    return { refund, error: "É obrigatório indicar o método de reembolso." };
  }
  const authorized = can({ operatorRole: input.operatorRole }, "payments", "reconcile");
  if (!authorized.allowed) {
    return { refund, error: authorized.reason ?? "Sem permissão para processar reembolsos." };
  }
  return {
    refund: { ...refund, status: "EM_PROCESSAMENTO", method: input.method.trim() },
  };
}

/**
 * 5) Liquidação — confirmada por referência de reconciliação (nunca um print).
 * Só quem abriu o processamento pode marcá-la, mas a prova é a referência.
 */
export function settleRefund(
  refund: Refund,
  input: { ref: string; proofUrl?: string; nowIso?: string }
): RefundResult {
  if (refund.status !== "EM_PROCESSAMENTO") {
    return { refund, error: `Só reembolsos em processamento são liquidados (estado: ${refund.status}).` };
  }
  if (!input.ref.trim()) {
    return { refund, error: "Faltam a referência bancária da liquidação." };
  }
  return {
    refund: {
      ...refund,
      status: "REEMBOLSADO",
      settledRef: input.ref.trim(),
      proofUrl: input.proofUrl,
      settledAtIso: input.nowIso ?? new Date().toISOString(),
    },
  };
}

/** 6) Cancelamento por quem preparou (antes da liquidação). */
export function cancelRefund(refund: Refund, input: { byId: string; nowIso?: string }): RefundResult {
  if (!["SOLICITADO", "EM_APROVACAO", "APROVADO"].includes(refund.status)) {
    return { refund, error: `Não se cancela um reembolso ${refund.status.toLowerCase()}.` };
  }
  if (input.byId !== refund.requestedById) {
    return { refund, error: "Só o requerente pode cancelar o próprio pedido." };
  }
  return { refund: { ...refund, status: "CANCELADO" } };
}

/** Prazo ultrapassado → sinal para notificação/escalamento (fila de compliance). */
export function checkRefundDeadline(
  refund: Refund,
  nowIso: string
): { escalated: boolean; status: RefundStatus; reason?: string } {
  if (nowIso < refund.deadlineIso) return { escalated: false, status: refund.status };
  if (refund.status === "SOLICITADO" || refund.status === "EM_APROVACAO") {
    return { escalated: true, status: refund.status, reason: "Aprovação pendente além do prazo." };
  }
  if (refund.status === "APROVADO") {
    return { escalated: true, status: refund.status, reason: "Aprovado sem processamento antes do prazo." };
  }
  return { escalated: false, status: refund.status };
}