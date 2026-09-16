// ---------------------------------------------------------------------------
// Máquina de estados do negócio (Anexo B — Opção 0, dedução na fonte, 30/70).
// Pura e determinística: a matriz de transições + guards de DINHEIRO. As rotas
// consomem canTransition() e nunca deixam o estado saltar sem o gate cumprido.
// Regra de ouro: nenhuma transição de dinheiro sem confirmação de quem recebe
// (os 90% só o vendedor confirma — SETTLED).
// Spec v3: RELATORIO_SOLICITADO + estados de exceção (bloqueios, suspensão,
// fraude, reembolso). Estados de exceção com saídas EXPLÍCITAS (FIXED) — não
// herdam os "exit de exceção" genéricos.
// ---------------------------------------------------------------------------

export type DealStatusName =
  | "LEAD"
  | "QUEUED"
  | "AGENT_ASSIGNED"
  | "QUALIFYING"
  | "FEES_PENDING"
  | "VISIT_SCHEDULED"
  | "VISIT_DONE"
  | "RELATORIO_SOLICITADO"
  | "DUE_DILIGENCE"
  | "REPORT_DELIVERED"
  | "NEGOTIATING"
  | "AGREED"
  | "DEPOSIT_PENDING"
  | "DEPOSIT_PAID"
  | "ACT_SCHEDULED"
  | "ACT_IN_PROGRESS"
  | "SETTLED"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "EXPIRED_UNPAID"
  | "SELLER_WITHDREW"
  | "BUYER_WITHDREW"
  | "DISPUTED"
  | "BLOQUEADO_POR_DOCUMENTOS"
  | "BLOQUEADO_POR_RISCO"
  | "SUSPENSO"
  | "FRAUDE_EM_INVESTIGACAO"
  | "REEMBOLSO_PENDENTE"
  | "REEMBOLSO_CONCLUIDO";

/** Caminho principal do fluxo (Anexo B + spec v3). */
const MAIN_FLOW: Record<DealStatusName, DealStatusName[]> = {
  LEAD: ["QUEUED"],
  QUEUED: ["AGENT_ASSIGNED"],
  AGENT_ASSIGNED: ["QUALIFYING"],
  QUALIFYING: ["FEES_PENDING"],
  FEES_PENDING: ["VISIT_SCHEDULED"],
  VISIT_SCHEDULED: ["VISIT_DONE"],
  VISIT_DONE: ["RELATORIO_SOLICITADO"],
  RELATORIO_SOLICITADO: ["DUE_DILIGENCE"],
  DUE_DILIGENCE: ["REPORT_DELIVERED", "CLOSED_LOST"],
  REPORT_DELIVERED: ["NEGOTIATING"],
  NEGOTIATING: ["AGREED"],
  AGREED: ["DEPOSIT_PENDING"],
  DEPOSIT_PENDING: ["DEPOSIT_PAID", "EXPIRED_UNPAID"],
  DEPOSIT_PAID: ["ACT_SCHEDULED"],
  ACT_SCHEDULED: ["ACT_IN_PROGRESS"],
  ACT_IN_PROGRESS: ["SETTLED"],
  SETTLED: ["CLOSED_WON"],
  // Estados de exceção — saídas EXPLÍCITAS (ver FIXED_EXITS):
  CLOSED_WON: [],
  CLOSED_LOST: [],
  EXPIRED_UNPAID: [],
  SELLER_WITHDREW: [],
  BUYER_WITHDREW: [],
  DISPUTED: [],
  BLOQUEADO_POR_DOCUMENTOS: ["DUE_DILIGENCE"], // reverificar documentação
  BLOQUEADO_POR_RISCO: ["FRAUDE_EM_INVESTIGACAO"],
  SUSPENSO: ["DUE_DILIGENCE", "REEMBOLSO_PENDENTE", "SELLER_WITHDREW", "BUYER_WITHDREW"],
  FRAUDE_EM_INVESTIGACAO: [],
  REEMBOLSO_PENDENTE: ["REEMBOLSO_CONCLUIDO", "DISPUTED"],
  REEMBOLSO_CONCLUIDO: [],
};

/** Saídas de exceção genéricas disponíveis em qualquer estado NÃO-terminal e
 *  não coberto por FIXED_EXITS. */
const EXCEPTION_EXITS: DealStatusName[] = [
  "CLOSED_LOST",
  "DISPUTED",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
  "BLOQUEADO_POR_DOCUMENTOS",
  "BLOQUEADO_POR_RISCO",
  "SUSPENSO",
  "FRAUDE_EM_INVESTIGACAO",
  "REEMBOLSO_PENDENTE",
];

/** Estados com saídas explicitamente controladas (não herdam as genéricas). */
const FIXED_EXITS: DealStatusName[] = [
  "CLOSED_WON",
  "CLOSED_LOST",
  "EXPIRED_UNPAID",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
  "DISPUTED",
  "BLOQUEADO_POR_DOCUMENTOS",
  "BLOQUEADO_POR_RISCO",
  "SUSPENSO",
  "FRAUDE_EM_INVESTIGACAO",
  "REEMBOLSO_PENDENTE",
  "REEMBOLSO_CONCLUIDO",
];

/** Estados terminais: sem qualquer saída. */
const TERMINAL: DealStatusName[] = [
  "CLOSED_WON",
  "CLOSED_LOST",
  "EXPIRED_UNPAID",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
  "DISPUTED",
  "FRAUDE_EM_INVESTIGACAO",
  "REEMBOLSO_CONCLUIDO",
];

/**
 * Guards obrigatórios por transição de dinheiro. Chaves do `guards` recebido
 * em canTransition(). SETTLED requer sellerReceiptConfirmedAt — o AGENTE nunca
 * confirma o dinheiro do vendedor. REEMBOLSO exige confirmação bancária.
 */
export const TRANSITION_GUARDS: Record<string, string[]> = {
  "AGREED→DEPOSIT_PENDING": ["buyerOtpAt", "sellerOtpAt"],
  "DEPOSIT_PENDING→DEPOSIT_PAID": ["depositPaid"],
  "ACT_SCHEDULED→ACT_IN_PROGRESS": ["balancePaid"],
  "ACT_IN_PROGRESS→SETTLED": ["sellerReceiptConfirmedAt"],
  "SETTLED→CLOSED_WON": ["handoverConfirmed"],
  "REEMBOLSO_PENDENTE→REEMBOLSO_CONCLUIDO": ["refundSettled"],
};

export type TransitionOutcome =
  | { ok: true }
  | { ok: false; reason: string; missingGuards: string[] };

export function allowedTransitions(from: DealStatusName): DealStatusName[] {
  if (FIXED_EXITS.includes(from)) return MAIN_FLOW[from] ?? [];
  const flow = MAIN_FLOW[from] ?? [];
  const exceptions = EXCEPTION_EXITS.filter((s) => s !== from && !flow.includes(s));
  return [...flow, ...exceptions];
}

/** Chave "FROM→TO" usada para procurar guards de dinheiro. */
function guardKey(from: DealStatusName, to: DealStatusName): string {
  return `${from}→${to}`;
}

export function canTransition(
  from: DealStatusName,
  to: DealStatusName,
  guards: Record<string, boolean> = {}
): TransitionOutcome {
  if (!(from in MAIN_FLOW)) {
    return { ok: false, reason: `Estado desconhecido: ${from}`, missingGuards: [] };
  }
  if (!allowedTransitions(from).includes(to)) {
    return { ok: false, reason: `Transição inválida: ${from} → ${to}`, missingGuards: [] };
  }
  const required = TRANSITION_GUARDS[guardKey(from, to)] ?? [];
  const missingGuards = required.filter((g) => guards[g] !== true);
  if (missingGuards.length > 0) {
    return { ok: false, reason: `Transição bloqueada: faltam confirmações (${from} → ${to}).`, missingGuards };
  }
  return { ok: true };
}

/** Transições de dinheiro (as que exigem guard na matriz). */
export function isMoneyTransition(from: DealStatusName, to: DealStatusName): boolean {
  return guardKey(from, to) in TRANSITION_GUARDS;
}