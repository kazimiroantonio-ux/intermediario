// ---------------------------------------------------------------------------
// Painel do agente (Fase 2, bloco 2) — finanças e solicitação de pagamento.
// Agregações puras sobre comissões/pagamentos (cêntimos AOA, BigInt).
// A comissão já vem calculada por lib/commission.ts; aqui agregam-se valores
// e decide-se a solicitação. Nenhum valor monetário vem do frontend.
// ---------------------------------------------------------------------------

// Saldo mínimo para solicitar pagamento: 10.000 Kz em cêntimos.
// Valor operacional definido nesta fase; exposto como constante testável.
export const MIN_PAYOUT_MINOR = 1_000_000n;

export interface CommissionLike {
  status: string; // CommissionStatus
  agentAmount: bigint;
  /** Preenchido quando a comissão já está alocada a um pagamento. */
  payoutId?: string | null;
}

export interface PayoutLike {
  status: string; // PayoutStatus
  netAmount: bigint;
}

export interface AgentFinanceAggregate {
  /** Comissões PAYABLE — disponíveis para solicitar pagamento. */
  availableMinor: bigint;
  /** Comissões PENDING ou ACCRUED — ainda não disponíveis. */
  pendingMinor: bigint;
  /** Comissões PAYABLE + PENDING/ACCRUED (exclui paid/reversed/disputed). */
  outstandingMinor: bigint;
  /** Comissões marcadas como PAID na tabela de comissões. */
  commissionPaidMinor: bigint;
  /** Total líquido de pagamentos PAID (montante já recebido). */
  totalReceivedMinor: bigint;
  disputedMinor: bigint;
  reversedMinor: bigint;
}

/**
 * Agrega comissões por estado real do enum CommissionStatus
 * (PENDING | ACCRUED | PAYABLE | PAID | REVERSED | DISPUTED).
 * PAYABLE + payoutId preenchido = já alocada a um pagamento → não conta no
 * saldo disponível (evita dupla solicitação).
 */
export function aggregateCommissions(commissions: CommissionLike[]): {
  availableMinor: bigint;
  pendingMinor: bigint;
  outstandingMinor: bigint;
  commissionPaidMinor: bigint;
  disputedMinor: bigint;
  reversedMinor: bigint;
  byStatus: Record<string, bigint>;
} {
  const byStatus: Record<string, bigint> = {};
  for (const c of commissions) {
    byStatus[c.status] = (byStatus[c.status] ?? 0n) + c.agentAmount;
  }
  let available = 0n;
  for (const c of commissions) {
    if (c.status === "PAYABLE" && !c.payoutId) available += c.agentAmount;
  }
  const pending = (byStatus["PENDING"] ?? 0n) + (byStatus["ACCRUED"] ?? 0n);
  const disputed = byStatus["DISPUTED"] ?? 0n;
  const reversed = byStatus["REVERSED"] ?? 0n;
  return {
    availableMinor: available,
    pendingMinor: pending,
    outstandingMinor: available + pending,
    commissionPaidMinor: byStatus["PAID"] ?? 0n,
    disputedMinor: disputed,
    reversedMinor: reversed,
    byStatus,
  };
}

/** Total líquido de pagamentos com status PAID (o que o agente já recebeu). */
export function totalReceivedFromPayouts(payouts: PayoutLike[]): bigint {
  let total = 0n;
  for (const p of payouts) {
    if (p.status === "PAID") total += p.netAmount;
  }
  return total;
}

export type PayoutRequestDecision = { ok: true } | { ok: false; reason: string };

export const PAYOUT_REQUIREMENTS = {
  NO_BALANCE: "Sem saldo disponível para solicitar pagamento.",
  BELOW_MIN: "Saldo abaixo do mínimo para solicitar pagamento.",
  NO_BANK: "Adicione e verifique uma conta bancária em \"Definições\" antes de solicitar pagamento.",
  PENDING: "Já existe uma solicitação de pagamento pendente. Aguarde a conclusão.",
} as const;

export function canRequestPayout(input: {
  availableMinor?: bigint;
  minPayoutMinor?: bigint;
  hasVerifiedBankAccount: boolean;
  hasPendingPayout: boolean;
}): PayoutRequestDecision {
  const available = input.availableMinor ?? 0n;
  if (available <= 0n) return { ok: false, reason: PAYOUT_REQUIREMENTS.NO_BALANCE };
  const min = input.minPayoutMinor ?? MIN_PAYOUT_MINOR;
  if (available < min) return { ok: false, reason: PAYOUT_REQUIREMENTS.BELOW_MIN };
  if (!input.hasVerifiedBankAccount) return { ok: false, reason: PAYOUT_REQUIREMENTS.NO_BANK };
  if (input.hasPendingPayout) return { ok: false, reason: PAYOUT_REQUIREMENTS.PENDING };
  return { ok: true };
}

export interface BuiltPayoutRequest {
  periodStartIso: string;
  periodEndIso: string;
  grossMinor: bigint;
  withholdingMinor: bigint;
  netMinor: bigint;
}

/**
 * Constrói a solicitação no período corrente (mês UTC). Período = mês atual
 * para que cada solicitação corresponda a um mês civil (consistência com o
 * payout). Valores: gross = saldo disponível; sem retenção nesta fase.
 */
export function buildPayoutRequest(input: {
  nowIso?: string;
  grossMinor: bigint;
  withholdingMinor?: bigint;
}): BuiltPayoutRequest {
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStartIso = new Date(Date.UTC(year, month, 1)).toISOString();
  const periodEndIso = new Date(Date.UTC(year, month + 1, 0)).toISOString();
  const withholding = input.withholdingMinor ?? 0n;
  const net = input.grossMinor - withholding;
  return {
    periodStartIso,
    periodEndIso,
    grossMinor: input.grossMinor,
    withholdingMinor: withholding,
    netMinor: net < 0n ? 0n : net,
  };
}

/**
 * Normaliza a chave de idempotência enviada pelo cliente. Devolve null se
 * vazia ou excessiva — nesse caso a rota recusa (sem criar duplicados à toa).
 */
export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  const key = (raw ?? "").trim();
  if (!key || key.length > 128) return null;
  return key;
}