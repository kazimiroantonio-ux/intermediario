// ---------------------------------------------------------------------------
// Painel do Vendedor — finanças e resumo (Fase 2, bloco 3).
// Funções PURAS: montantes em cêntimos (bigint), provenientes SEMPRE de valores
// persistidos no backend. O vendedor PAGA a comissão (totalCommission) — o
// "pending" é o que ainda não saiu da carteira; o "paid" é o que já foi pago;
// "reverted" (REVERSED) é informativo (estorno). Receitas = SellerTransfer
// (registo informativo dos 90% — não custódia).
// ---------------------------------------------------------------------------

import type { DealStatusName } from "./dealStateMachine.ts";

export interface SellerCommissionLike {
  totalCommission: bigint;
  status: string;
}

export interface SellerFinanceAggregate {
  /** Comissões a pagar (PENDING | ACCRUED | PAYABLE | DISPUTED), em cêntimos. */
  pendingMinor: bigint;
  /** Comissões já pagas (PAID), em cêntimos. */
  paidMinor: bigint;
  /** Comissões estornadas (REVERSED), em cêntimos. */
  revertedMinor: bigint;
}

export function sellerFinanceSummary(
  commissions: SellerCommissionLike[]
): SellerFinanceAggregate {
  const agg: SellerFinanceAggregate = { pendingMinor: 0n, paidMinor: 0n, revertedMinor: 0n };
  for (const c of commissions) {
    if (c.status === "PAID") agg.paidMinor += c.totalCommission;
    else if (c.status === "REVERSED") agg.revertedMinor += c.totalCommission;
    else agg.pendingMinor += c.totalCommission;
  }
  return agg;
}

/** Soma das transferências dos 90% ao vendedor (registo informativo). */
export function sumTransfersMinor(transfers: { amount: bigint }[]): bigint {
  let total = 0n;
  for (const t of transfers) total += t.amount;
  return total;
}

// ---------------------------------------------------------------------------
// Resumo de negócios do vendedor (deals onde sellerId = utilizador).
// ---------------------------------------------------------------------------

export interface SellerDealLike {
  status: DealStatusName;
}

const ACTIVE_STATES = [
  "QUEUED",
  "AGENT_ASSIGNED",
  "QUALIFYING",
  "FEES_PENDING",
  "VISIT_SCHEDULED",
  "VISIT_DONE",
  "RELATORIO_SOLICITADO",
  "DUE_DILIGENCE",
  "REPORT_DELIVERED",
  "NEGOTIATING",
  "AGREED",
  "DEPOSIT_PENDING",
  "DEPOSIT_PAID",
  "ACT_SCHEDULED",
  "ACT_IN_PROGRESS",
  "BLOQUEADO_POR_DOCUMENTOS",
  "BLOQUEADO_POR_RISCO",
  "DISPUTED",
] as const satisfies readonly DealStatusName[];

const WON_STATES = ["CLOSED_WON", "REEMBOLSO_CONCLUIDO"] as const satisfies readonly DealStatusName[];
const LOST_STATES = [
  "CLOSED_LOST",
  "EXPIRED_UNPAID",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
  "REEMBOLSO_PENDENTE",
  "FRAUDE_EM_INVESTIGACAO",
] as const satisfies readonly DealStatusName[];

export type SellerDealSummary = {
  total: number;
  open: number;
  won: number;
  lost: number;
  byState: Record<string, number>;
};

export function sellerDealSummary(deals: SellerDealLike[]): SellerDealSummary {
  let open = 0;
  let won = 0;
  let lost = 0;
  const byState: Record<string, number> = {};
  for (const d of deals) {
    byState[d.status] = (byState[d.status] ?? 0) + 1;
    if ((WON_STATES as readonly string[]).includes(d.status)) won++;
    else if ((LOST_STATES as readonly string[]).includes(d.status)) lost++;
    else if ((ACTIVE_STATES as readonly string[]).includes(d.status)) open++;
  }
  return { total: deals.length, open, won, lost, byState };
}

export const COMMISSION_PENDING_STATUSES = [
  "PENDING",
  "ACCRUED",
  "PAYABLE",
  "DISPUTED",
] as const;