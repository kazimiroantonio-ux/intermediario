// ---------------------------------------------------------------------------
// Painel do agente (Fase 2, bloco 2) — agregações puras sobre negócios,
// comissões e pagamentos do agente. Determinístico; as páginas mapeiam os
// registos Prisma para estes tipos e chamam as funções aqui.
// ---------------------------------------------------------------------------

import { allowedTransitions, type DealStatusName } from "./dealStateMachine.ts";

export interface AgentDealLike {
  id: string;
  reference: string;
  status: DealStatusName;
  createdAtIso: string;
  queuedAtIso?: string | null;
  firstContactAtIso?: string | null;
  agreedPriceCents?: bigint | null;
}

export interface AgentCommissionLike {
  id: string;
  status: string; // PENDING | ACCRUED | PAYABLE | PAID | REVERSED
  agentAmountCents: bigint;
  accruedAtIso?: string | null;
  paidAtIso?: string | null;
}

export interface AgentPayoutLike {
  id: string;
  status: string; // DRAFT | APPROVED | PAID | ...
  netAmountCents: bigint;
  periodStartIso: string;
  paidAtIso?: string | null;
}

/** Estados em que o agente tem trabalho aberto (pipeline ativo). */
const ACTIVE_STATES: readonly DealStatusName[] = [
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
];

/** Estados de vitória/derrota para contagem de resultados. */
const WON_STATES: readonly DealStatusName[] = ["CLOSED_WON", "SETTLED"];
const LOST_STATES: readonly DealStatusName[] = [
  "CLOSED_LOST",
  "EXPIRED_UNPAID",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
];

/**
 * SLA call center: primeira tentativa de contacto num negócio já na fila do
 * agente deve acontecer em poucas horas após a atribuição.
 */
export const FIRST_CONTACT_SLA_MINUTES = 4 * 60;

export function agentDealSummary(deals: AgentDealLike[], nowIso: string) {
  let open = 0;
  let won = 0;
  let lost = 0;
  let overdueFirstContact = 0;
  const byState: Record<string, number> = {};
  let pipelineDays = 0;

  for (const d of deals) {
    byState[d.status] = (byState[d.status] ?? 0) + 1;
    if (ACTIVE_STATES.includes(d.status)) open += 1;
    if (WON_STATES.includes(d.status)) won += 1;
    if (LOST_STATES.includes(d.status)) lost += 1;

    if (!d.firstContactAtIso && d.queuedAtIso && ACTIVE_STATES.includes(d.status)) {
      const since = (new Date(nowIso).getTime() - new Date(d.queuedAtIso).getTime()) / 60_000;
      if (since > FIRST_CONTACT_SLA_MINUTES) overdueFirstContact += 1;
    }
  }

  const activeAges = deals
    .filter((d) => ACTIVE_STATES.includes(d.status))
    .map((d) => (new Date(nowIso).getTime() - new Date(d.createdAtIso).getTime()) / 86_400_000);
  if (activeAges.length > 0) {
    pipelineDays = Math.round(activeAges.reduce((a, b) => a + b, 0) / activeAges.length * 10) / 10;
  }

  return {
    total: deals.length,
    open,
    won,
    lost,
    overdueFirstContact,
    pipelineDays,
    byState,
  };
}

export function agentFinanceSummary(
  commissions: AgentCommissionLike[],
  payouts: AgentPayoutLike[]
) {
  let pendingCents = 0n;
  let paidCents = 0n;
  for (const c of commissions) {
    if (c.status === "PAID") paidCents += c.agentAmountCents;
    else pendingCents += c.agentAmountCents;
  }

  let totalPayoutNetCents = 0n;
  let lastPayoutNetCents = 0n;
  let lastPayoutPeriodStartIso: string | null = null;
  const paidPayouts = payouts.filter((p) => p.status === "PAID");
  for (const p of paidPayouts) totalPayoutNetCents += p.netAmountCents;
  const sorted = [...paidPayouts].sort((a, b) => a.periodStartIso.localeCompare(b.periodStartIso));
  const last = sorted[sorted.length - 1];
  if (last) {
    lastPayoutNetCents = last.netAmountCents;
    lastPayoutPeriodStartIso = last.periodStartIso;
  }

  return {
    pendingCents,
    paidCents,
    totalPayoutNetCents,
    lastPayoutNetCents,
    lastPayoutPeriodStartIso,
  };
}

/** Próximos estados válidos a partir do estado atual (para a UI de transições). */
export function allowedDealStages(from: DealStatusName): DealStatusName[] {
  return allowedTransitions(from);
}

/** Rótulo PT legível por estado do negócio (UI). */
export const DEAL_STAGE_LABEL: Record<DealStatusName, string> = {
  LEAD: "Lead novo",
  QUEUED: "Na fila",
  AGENT_ASSIGNED: "Atribuído ao agente",
  QUALIFYING: "A qualificar",
  FEES_PENDING: "Taxas em falta",
  VISIT_SCHEDULED: "Visita marcada",
  VISIT_DONE: "Visita feita",
  RELATORIO_SOLICITADO: "Relatório solicitado",
  DUE_DILIGENCE: "Diligência / inspeção",
  REPORT_DELIVERED: "Relatório entregue",
  NEGOTIATING: "Em negociação",
  AGREED: "Acordo fechado",
  DEPOSIT_PENDING: "Depósito (30%) pendente",
  DEPOSIT_PAID: "Depósito (30%) pago",
  ACT_SCHEDULED: "Escritura marcada",
  ACT_IN_PROGRESS: "Escritura em curso",
  SETTLED: "Vendedor recebeu os 90%",
  CLOSED_WON: "Fechado com vitória",
  CLOSED_LOST: "Fechado sem acordo",
  EXPIRED_UNPAID: "Acordo caducado",
  SELLER_WITHDREW: "Vendedor desistiu",
  BUYER_WITHDREW: "Comprador desistiu",
  DISPUTED: "Em disputa",
  BLOQUEADO_POR_DOCUMENTOS: "Bloqueado por documentos",
  BLOQUEADO_POR_RISCO: "Bloqueado por risco",
  SUSPENSO: "Suspenso",
  FRAUDE_EM_INVESTIGACAO: "Fraude em investigação",
  REEMBOLSO_PENDENTE: "Reembolso pendente",
  REEMBOLSO_CONCLUIDO: "Reembolso concluído",
};

/** Etiqueta cromática por estado (para badges). */
export function dealStageTone(status: DealStatusName): "green" | "zinc" | "amber" | "red" | "blue" {
  if (WON_STATES.includes(status)) return "green";
  if (LOST_STATES.includes(status)) return "red";
  if (ACTIVE_STATES.includes(status)) return "blue";
  if (status === "DISPUTED" || status === "SUSPENSO" || status === "BLOQUEADO_POR_RISCO" || status === "FRAUDE_EM_INVESTIGACAO") return "red";
  if (status === "BLOQUEADO_POR_DOCUMENTOS" || status === "REEMBOLSO_PENDENTE" || status === "AGREED") return "amber";
  return "zinc";
}