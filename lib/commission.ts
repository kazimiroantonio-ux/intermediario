// ---------------------------------------------------------------------------
// Comissão — única fonte de verdade (v2: intermediação total por agentes)
// O agente é obrigatório. O VENDEDOR paga a comissão (rateBps); o agente recebe
// uma parte da comissão (agentShareBps). Montantes SEMPRE em cêntimos de Kwanza
// (inteiros), taxas em basis points (bps). Arredondamento a favor da plataforma.
// ---------------------------------------------------------------------------

export const DEFAULT_SITE_RATE_BPS = 1000; // 10,00% — plano Grátis/USER
export const DEFAULT_AGENT_SHARE_BPS = 5000; // 50,00% da comissão para o agente
export const DEFAULT_VAT_BPS = 1400; // Código do IVA — taxa geral 14%
export const DEFAULT_DEPOSIT_BPS = 3000; // comissão escalonada 30/70 — adesão no acerto
export const COMMISSION_MIN_MINOR = 100_000n; // mínimo global: 1.000 Kz = 100.000 cêntimos

// Taxa reduzida por plano do vendedor (v2, decisão 3): a parte do agente
// sai da fatia do site — o site assume a diferença.
export const PLAN_RATE_BPS: Record<string, number> = {
  USER: 1000, // Grátis — 10,00%
  VERIFIED_SELLER: 900, // 9,00%
  PRO: 800, // 8,00%
  ENTERPRISE: 700, // 7,00%
};

// Mínimos por categoria (v2, sec. 10.1 — obrigatório em qualquer cenário).
// Valores em cêntimos (100_000 = 1.000 Kz). Categoria sem entrada => mínimo global.
export const COMMISSION_MIN_BY_CATEGORY: Record<string, number> = {
  imoveis: 1_500_000, // 15.000 Kz
};

export interface CommissionBreakdown {
  /** Comissão total do site, em cêntimos */
  totalCommission: bigint;
  /** Parte do agente, em cêntimos */
  agentAmount: bigint;
  /** Parte da plataforma, em cêntimos. SEMPRE = totalCommission - agentAmount */
  platformAmount: bigint;
  /** true se foi aplicado o mínimo */
  usedMinimum: boolean;
  /** taxa aplicada (bps) */
  rateBps: number;
  /** split do agente aplicado (bps) */
  agentShareBps: number;
}

/** Mínimo de comissão por categoria (cêntimos), com fallback para o global. */
export function commissionMinMinor(category?: string): bigint {
  const entry = category ? COMMISSION_MIN_BY_CATEGORY[category] : undefined;
  return entry === undefined ? COMMISSION_MIN_MINOR : BigInt(entry);
}

/**
 * Computa a comissão de um negócio (v2).
 *
 * Regras:
 * - agreedPriceMinor é o valor final acordado, freezado no Deal (base da comissão).
 * - Arredondamento a favor da plataforma: platform = total - agent
 *   (nunca dois arredondamentos independentes).
 * - O mínimo aplica-se sobre a comissão TOTAL (antes do split).
 * - rateBps depende do plano do vendedor; agentShareBps do agente/compensação.
 */
export function computeCommission(
  agreedPriceMinor: bigint,
  rateBps: number = DEFAULT_SITE_RATE_BPS,
  agentShareBps: number = DEFAULT_AGENT_SHARE_BPS,
  minMinor: bigint = COMMISSION_MIN_MINOR,
): CommissionBreakdown {
  let total = (agreedPriceMinor * BigInt(rateBps)) / 10000n;

  const usedMinimum = total < minMinor;
  if (usedMinimum) total = minMinor;

  const agent = (total * BigInt(agentShareBps)) / 10000n;

  // A favor da plataforma: nunca dois arredondamentos independentes
  const platform = total - agent;

  return {
    totalCommission: total,
    agentAmount: agent,
    platformAmount: platform,
    usedMinimum,
    rateBps,
    agentShareBps,
  };
}

// ---------------------------------------------------------------------------
// Anexo B — dedução na fonte. O comprador paga a comissão (10% + IVA) ao site
// e os 90% ao vendedor. Invariantes (garantir em transação de BD):
//   commissionNet = agreedPrice * rateBps / 10000
//   commissionVat = commissionNet * vatBps / 10000
//   buyerPayable  = commissionNet + commissionVat  (pago ao SITE)
//   sellerPayable = agreedPrice − commissionNet    (pago ao VENDEDOR, no ato)
// A fatia do agente incide sobre a comissão LÍQUIDA de IVA, nunca no total.
// Os 90% (sellerPayable) NUNCA entram no ledger do site.
// ---------------------------------------------------------------------------

export interface AgreementBreakdown {
  /** agreedPrice (congelado no Deal), cêntimos */
  agreedPrice: bigint;
  /** comissão líquida (rateBps sobre o preço), cêntimos */
  commissionNet: bigint;
  /** IVA sobre a comissão líquida, cêntimos */
  commissionVat: bigint;
  /** buyerPayable = net + vat, cêntimos — pago ao site */
  buyerPayable: bigint;
  /** sellerPayable = agreedPrice − net, cêntimos — pago ao vendedor, no ato */
  sellerPayable: bigint;
  /** parte do agente (sobre a comissão líquida), cêntimos */
  agentAmount: bigint;
  /** parte da plataforma (líquida de IVA, após split), cêntimos */
  platformAmount: bigint;
  /** adesão (30% do buyerPayable, cobrada no acerto), cêntimos */
  depositAmount: bigint;
  /** saldo (70% do buyerPayable, cobrado no ato), cêntimos */
  balanceAmount: bigint;
  /** true se foi aplicado o mínimo */
  usedMinimum: boolean;
  rateBps: number;
  vatBps: number;
  agentShareBps: number;
  depositBps: number;
}

/**
 * Computa os valores do Acordo de Negócio (Anexo B). Invariantes garantidas:
 *   commissionNet + sellerPayable === agreedPrice
 *   depositAmount + balanceAmount === buyerPayable
 * Sem cêntimos criados/perdidos (arredondamento único, a favor da plataforma).
 */
export function computeAgreement(
  agreedPriceMinor: bigint,
  rateBps: number = DEFAULT_SITE_RATE_BPS,
  agentShareBps: number = DEFAULT_AGENT_SHARE_BPS,
  vatBps: number = DEFAULT_VAT_BPS,
  minMinor: bigint = COMMISSION_MIN_MINOR,
  depositBps: number = DEFAULT_DEPOSIT_BPS,
): AgreementBreakdown {
  const { totalCommission, agentAmount, platformAmount, usedMinimum } = computeCommission(
    agreedPriceMinor,
    rateBps,
    agentShareBps,
    minMinor,
  );

  const commissionVat = (totalCommission * BigInt(vatBps)) / 10000n;
  const buyerPayable = totalCommission + commissionVat;
  const sellerPayable = agreedPriceMinor - totalCommission;

  // 30/70 sobre o valor TOTAL a cobrar ao comprador (deposit + balance = buyerPayable)
  const deposit = (buyerPayable * BigInt(depositBps)) / 10000n;
  const balance = buyerPayable - deposit; // saldo absorve o arredondamento

  return {
    agreedPrice: agreedPriceMinor,
    commissionNet: totalCommission,
    commissionVat,
    buyerPayable,
    sellerPayable,
    agentAmount,
    platformAmount,
    depositAmount: deposit,
    balanceAmount: balance,
    usedMinimum,
    rateBps,
    vatBps,
    agentShareBps,
    depositBps,
  };
}

/** Converte Kwanza (Decimal/number) em cêntimos BigInt. */
export function toMinor(value: number | string): bigint {
  const num = typeof value === "string" ? Number(value) : value;
  return BigInt(Math.round(num * 100));
}

/** Converte cêntimos BigInt de volta para Kwanza como número. */
export function fromMinor(minor: bigint): number {
  return Number(minor) / 100;
}