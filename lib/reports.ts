// ---------------------------------------------------------------------------
// (Prioridade 11) Relatórios da direção (spec v3 sec. 15).
// Agregados determinísticos sobre eventos/estados puros: KPIs, funil de
// negócios, receita por mês (somas em cêntimos de Kz, sem arredondamentos
// escondidos), filas/SLA e saúde da verificação.
// ---------------------------------------------------------------------------

import type { WorkQueueItem } from "./workQueue.ts";

export interface ReportDeal {
  state: string;
  createdAtIso: string;
}

export interface ReportListing {
  status: string;
  expiresAtIso?: string;
  publishedAtIso?: string;
}

export interface ReportPaymentLike {
  dealId: string;
  phase: string;
  amountCents: bigint;
  reconciledAt?: string;
  createdAtIso: string;
}

export interface ReportVerificationLike {
  subjectType: string;
  status: string;
  riskLevel: string;
  createdAtIso: string;
  approvedAtIso?: string;
}

export interface ReportDashboard {
  asOfIso: string;
  mass: {
    deals: number;
    listings: number;
    openDisputes: number;
    activeVerifications: number;
  };
  dealsByState: Record<string, number>;
  listingsByStatus: Record<string, number>;
  revenue: {
    reconciledKz: string; // string — BigInt não serializa em JSON
    pendingKz: string;
    byMonth: Array<{ month: string; reconciledKz: string; pendingKz: string }>;
  };
  verification: {
    submitted: number;
    verified: number;
    rejected: number;
    pending: number;
    highRiskPending: number;
    approvalRatePct: number;
  };
  queues: {
    byQueue: Record<string, number>;
    overdue: number;
    slaCompliancePct: number;
  };
  risk: {
    highRiskSubjects: number;
    failures: number;
  };
}

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function bigSum(values: Array<bigint | undefined>): bigint {
  let acc = 0n;
  for (const v of values) acc += v ?? 0n;
  return acc;
}

export function buildDashboard(input: {
  nowIso: string;
  deals: ReportDeal[];
  listings: ReportListing[];
  payments: ReportPaymentLike[];
  verifications: ReportVerificationLike[];
  queueItems: WorkQueueItem[];
  disputesOpen: number;
}): ReportDashboard {
  const monthKeys: string[] = [];
  for (const p of input.payments) {
    const m = monthOf(p.createdAtIso);
    if (!monthKeys.includes(m)) monthKeys.push(m);
  }
  monthKeys.sort();

  const reconciledByMonth: Record<string, bigint> = {};
  const pendingByMonth: Record<string, bigint> = {};
  let reconciledTotal = 0n;
  let pendingTotal = 0n;
  for (const p of input.payments) {
    const m = monthOf(p.createdAtIso);
    if (p.phase === "RECONCILIADO" || p.phase === "REEMBOLSO_PENDENTE" || p.phase === "REEMBOLSADO") {
      reconciledByMonth[m] = (reconciledByMonth[m] ?? 0n) + p.amountCents;
      reconciledTotal += p.amountCents;
    } else if (p.phase === "AGUARDA_PAGAMENTO" || p.phase === "INICIADO" || p.phase === "PENDENTE_NO_BANCO" || p.phase === "RECEBIDO") {
      pendingByMonth[m] = (pendingByMonth[m] ?? 0n) + p.amountCents;
      pendingTotal += p.amountCents;
    }
  }

  const dealsByState: Record<string, number> = {};
  for (const d of input.deals) dealsByState[d.state] = (dealsByState[d.state] ?? 0) + 1;

  const listingsByStatus: Record<string, number> = {};
  let expiredAuto = 0;
  for (const l of input.listings) {
    listingsByStatus[l.status] = (listingsByStatus[l.status] ?? 0) + 1;
    if (l.status === "ACTIVE" && l.expiresAtIso && input.nowIso >= l.expiresAtIso) expiredAuto += 1;
  }
  listingsByStatus["EXPIRING_SOON"] = expiredAuto;

  let submitted = 0;
  let verified = 0;
  let rejected = 0;
  let pending = 0;
  let highRiskPending = 0;
  for (const v of input.verifications) {
    if (v.status === "SUBMITTED" || v.status === "IN_REVIEW" || v.status === "NEEDS_MORE_INFO") {
      pending += 1;
      if (v.riskLevel === "HIGH") highRiskPending += 1;
      submitted += 1;
    } else if (v.status === "VERIFIED") verified += 1;
    else if (v.status === "REJECTED") rejected += 1;
  }
  const approvalRatePct = submitted + rejected === 0 ? 0 : Math.round((verified / (submitted + rejected)) * 100);

  const byQueue: Record<string, number> = {};
  let overdue = 0;
  let withinSla = 0;
  let openQueueItems = 0;
  for (const q of input.queueItems) {
    if (q.status === "CONCLUIDO") continue;
    openQueueItems += 1;
    byQueue[q.queue] = (byQueue[q.queue] ?? 0) + 1;
    if (input.nowIso >= q.deadlineIso) overdue += 1;
    else withinSla += 1;
  }
  const slaCompliancePct = openQueueItems === 0 ? 100 : Math.round((withinSla / openQueueItems) * 100);

  return {
    asOfIso: input.nowIso,
    mass: {
      deals: input.deals.length,
      listings: input.listings.length,
      openDisputes: input.disputesOpen,
      activeVerifications: pending,
    },
    dealsByState,
    listingsByStatus,
    revenue: {
      reconciledKz: reconciledTotal.toString(),
      pendingKz: pendingTotal.toString(),
      byMonth: monthKeys.map((m) => ({
        month: m,
        reconciledKz: (reconciledByMonth[m] ?? 0n).toString(),
        pendingKz: (pendingByMonth[m] ?? 0n).toString(),
      })),
    },
    verification: {
      submitted,
      verified,
      rejected,
      pending,
      highRiskPending,
      approvalRatePct,
    },
    queues: {
      byQueue,
      overdue,
      slaCompliancePct,
    },
    risk: {
      highRiskSubjects: highRiskPending,
      failures: input.payments.filter((p) => p.phase === "FALHOU").length,
    },
  };
}