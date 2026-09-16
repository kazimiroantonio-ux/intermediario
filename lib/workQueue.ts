// ---------------------------------------------------------------------------
// Consola interna — filas de trabalho (spec v3 sec. 9).
// Cada item tem: responsável, prioridade, prazo (SLA), estado, próximo passo,
// histórico e escalamento. Fila determinística e pura; os adaptadores
// convertem casos de `verificationWorkflow`/`refundWorkflow` em itens.
// ---------------------------------------------------------------------------

import type { VerificationCase } from "./verificationWorkflow.ts";
import type { Refund } from "./refundWorkflow.ts";

export type WorkQueueName = "VERIFICATION" | "FINANCIAL" | "COMPLIANCE" | "SUPPORT";

export type QueueItemStatus = "NOVO" | "ATRIBUIDO" | "EM_CURSO" | "AGUARDANDO" | "CONCLUIDO";

export type QueuePriority = "ALTA" | "MEDIA" | "BAIXA";

export interface WorkQueueHistoryEntry {
  from: QueueItemStatus | "-";
  to: QueueItemStatus;
  actorId: string;
  atIso: string;
  note?: string;
}

export interface WorkQueueItem {
  id: string;
  queue: WorkQueueName;
  category: string; // ex.: "docs.pendentes" | "reembolso.aprovacao" | "kyc.pendente" | "reclamacao"
  entityType: "DEAL" | "LISTING" | "USER" | "REFUND" | "TICKET";
  subjectId: string; // id interno da entidade (nunca chaves manuais)
  priority: QueuePriority;
  status: QueueItemStatus;
  assigneeId?: string;
  deadlineIso: string;
  nextStep?: string;
  escalateLevel: 0 | 1 | 2;
  history: WorkQueueHistoryEntry[];
  createdAtIso: string;
  updatedAtIso: string;
}

/** SLA por prioridade (minutos) — determina o prazo de um item novo. */
export const SLA_MINUTES: Record<QueuePriority, number> = {
  ALTA: 240, // 4 horas
  MEDIA: 1440, // 1 dia
  BAIXA: 4320, // 3 dias
};

/** Filas e categorias visíveis na consola. */
export const WORK_QUEUES: Record<WorkQueueName, readonly string[]> = {
  VERIFICATION: ["anuncio.novo", "docs.pendentes", "docs.rejeitados", "divergencias", "urgentes", "docs.expirados"],
  FINANCIAL: ["pagamento.pendente", "pagamento.nao_reconciliado", "reembolso.aprovacao", "reembolso.execucao", "pagamento.terceiro", "divergencia.valores", "comissao.atraso"],
  COMPLIANCE: ["kyc.pendente", "risco.elevado", "beneficiario.efetivo", "pep", "origem.fundos", "atividade.anormal", "fraude.suspeita"],
  SUPPORT: ["pedido.novo", "reclamacao", "disputa", "sem_resposta", "prazo.ultrapassado"],
};

export interface QueueResult {
  item?: WorkQueueItem;
  error?: string;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * Transições permitidas — um item concluído é terminal; escalamento criada por
 * `escalateItem` não passa pelo status.
 */
const TRANSITIONS: Record<QueueItemStatus, readonly QueueItemStatus[]> = {
  NOVO: ["ATRIBUIDO", "EM_CURSO", "AGUARDANDO", "CONCLUIDO"],
  ATRIBUIDO: ["EM_CURSO", "AGUARDANDO", "CONCLUIDO"],
  EM_CURSO: ["AGUARDANDO", "CONCLUIDO"],
  AGUARDANDO: ["ATRIBUIDO", "EM_CURSO", "CONCLUIDO"],
  CONCLUIDO: [],
};

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

/** Cria um item na fila; o prazo vem do SLA da prioridade (a menos que dado). */
export function createQueueItem(input: {
  id: string;
  queue: WorkQueueName;
  category: string;
  entityType: WorkQueueItem["entityType"];
  subjectId: string;
  priority?: QueuePriority;
  dueAtIso?: string;
  nextStep?: string;
  assigneeId?: string;
  actorId: string;
  nowIso?: string;
}): QueueResult {
  if (!WORK_QUEUES[input.queue].includes(input.category)) {
    return { error: `Categoria "${input.category}" não existe na fila ${input.queue}.` };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  const priority = input.priority ?? "MEDIA";
  const deadlineIso = input.dueAtIso ?? addMinutes(nowIso, SLA_MINUTES[priority]);
  const item: WorkQueueItem = {
    id: input.id,
    queue: input.queue,
    category: input.category,
    entityType: input.entityType,
    subjectId: input.subjectId,
    priority,
    status: "NOVO",
    assigneeId: input.assigneeId,
    deadlineIso,
    nextStep: input.nextStep,
    escalateLevel: 0,
    history: [{ from: "-", to: "NOVO", actorId: input.actorId, atIso: nowIso }],
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
  return { item };
}

/** Atribui responsável (só se não estiver concluído e ainda sem dono). */
export function assignItem(
  item: WorkQueueItem,
  input: { assigneeId: string; actorId: string; note?: string; nowIso?: string }
): QueueResult {
  if (item.status === "CONCLUIDO") return { item, error: "Item concluído não é atribuível." };
  if (item.assigneeId && item.assigneeId !== input.assigneeId) {
    return { item, error: "Item já tem responsável atribuído." };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    item: {
      ...item,
      assigneeId: input.assigneeId,
      status: "ATRIBUIDO",
      updatedAtIso: nowIso,
      history: [...item.history, { from: item.status, to: "ATRIBUIDO", actorId: input.actorId, atIso: nowIso, note: input.note }],
    },
  };
}

/** Muda de estado respeitando a matriz de transições (recusa e explica). */
export function setItemStatus(
  item: WorkQueueItem,
  input: { to: QueueItemStatus; actorId: string; note?: string; nowIso?: string }
): QueueResult {
  if (item.status === input.to) return { item, error: "Estado já é este." };
  if (!TRANSITIONS[item.status].includes(input.to)) {
    return { item, error: `Transição ${item.status}→${input.to} não permitida.` };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    item: {
      ...item,
      status: input.to,
      updatedAtIso: nowIso,
      history: [...item.history, { from: item.status, to: input.to, actorId: input.actorId, atIso: nowIso, note: input.note }],
    },
  };
}

/** Define o próximo passo visível na fila. */
export function setNextStep(item: WorkQueueItem, nextStep: string): QueueResult {
  if (!nextStep.trim()) return { item, error: "Próximo passo vazio." };
  return { item: { ...item, nextStep: nextStep.trim(), updatedAtIso: new Date().toISOString() } };
}

/** Escala: sobe o nível, força ALTA + novo prazo SLA(ALTA) e regista o porquê. */
export function escalateItem(
  item: WorkQueueItem,
  input: { actorId: string; reason: string; nowIso?: string }
): QueueResult {
  if (item.status === "CONCLUIDO") return { item, error: "Item concluído não escala." };
  if (!input.reason.trim()) return { item, error: "O escalamento exige o motivo." };
  const nowIso = input.nowIso ?? new Date().toISOString();
  const escalateLevel = Math.min(item.escalateLevel + 1, 2) as 0 | 1 | 2;
  return {
    item: {
      ...item,
      escalateLevel,
      priority: "ALTA",
      deadlineIso: addMinutes(nowIso, SLA_MINUTES.ALTA),
      updatedAtIso: nowIso,
      history: [...item.history, { from: item.status, to: item.status, actorId: input.actorId, atIso: nowIso, note: `ESCALADO: ${input.reason}` }],
    },
  };
}

/** SLA: prazo ultrapassado e ainda sem conclusão. */
export function checkSla(item: WorkQueueItem, nowIso: string): { overdue: boolean; reason?: string } {
  if (item.status === "CONCLUIDO") return { overdue: false };
  if (nowIso >= item.deadlineIso) {
    return { overdue: true, reason: `Prazo (${item.deadlineIso}) ultrapassado — item ${item.category} em ${item.status}.` };
  }
  return { overdue: false };
}

/** Transfere entre filas (ex.: verificação → compliance) com novo prazo. */
export function requeueItem(
  item: WorkQueueItem,
  input: { queue: WorkQueueName; category: string; actorId: string; note?: string; nowIso?: string }
): QueueResult {
  if (item.status === "CONCLUIDO") return { item, error: "Item concluído não se requeua." };
  if (!WORK_QUEUES[input.queue].includes(input.category)) {
    return { error: `Categoria "${input.category}" não existe na fila ${input.queue}.` };
  }
  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    item: {
      ...item,
      queue: input.queue,
      category: input.category,
      status: "AGUARDANDO",
      assigneeId: undefined,
      deadlineIso: addMinutes(nowIso, SLA_MINUTES[item.priority]),
      updatedAtIso: nowIso,
      history: [...item.history, { from: item.status, to: "AGUARDANDO", actorId: input.actorId, atIso: nowIso, note: `REQUEUE → ${input.queue}: ${input.note ?? ""}` }],
    },
  };
}

/** Resumo por fila (painel da consola). */
export function workloadSummary(items: WorkQueueItem[]): Record<WorkQueueName, Record<QueuePriority, number>> {
  const out: Record<WorkQueueName, Record<QueuePriority, number>> = {
    VERIFICATION: { ALTA: 0, MEDIA: 0, BAIXA: 0 },
    FINANCIAL: { ALTA: 0, MEDIA: 0, BAIXA: 0 },
    COMPLIANCE: { ALTA: 0, MEDIA: 0, BAIXA: 0 },
    SUPPORT: { ALTA: 0, MEDIA: 0, BAIXA: 0 },
  };
  for (const it of items) {
    if (it.status !== "CONCLUIDO") out[it.queue][it.priority] += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adaptadores dos motores puros → itens de fila
// ---------------------------------------------------------------------------

/** Caso de verificação → item VERIFICATION (docs em falta, revisão pendente…). */
export function verificationToQueueItem(
  ver: VerificationCase,
  nowIso: string,
  id?: string
): QueueResult {
  if (ver.status === "VERIFIED") {
    return createQueueItem({
      id: id ?? `${ver.id}:none`,
      queue: "VERIFICATION",
      category: "anuncio.novo",
      entityType: ver.subjectType === "SELLER" ? "USER" : "LISTING",
      subjectId: ver.subjectId,
      priority: "BAIXA",
      nextStep: "Publicar (gate pronto).",
      actorId: "system.workqueue",
      nowIso,
    });
  }
  if (ver.status === "REJECTED") return { item: undefined };
  const missing = ver.checks.filter((c) => c.status === "PENDING").length;
  return createQueueItem({
    id: id ?? ver.id,
    queue: "VERIFICATION",
    category: ver.risk.level === "HIGH" ? "urgentes" : missing > 0 ? "docs.pendentes" : "anuncio.novo",
    entityType: ver.subjectType === "SELLER" ? "USER" : "LISTING",
    subjectId: ver.subjectId,
    priority: ver.risk.level === "HIGH" ? "ALTA" : missing > 0 ? "MEDIA" : "BAIXA",
    nextStep: missing > 0 ? "Pedir documentos em falta." : "Atribuir verificador.",
    actorId: "system.workqueue",
    nowIso,
  });
}

/** Risco alto verificado → fila COMPLIANCE (revisão de risco / beneficiário efetivo). */
export function complianceToQueueItem(
  ver: VerificationCase,
  nowIso: string,
  id?: string
): QueueResult {
  if (ver.risk.level !== "HIGH") return { item: undefined };
  const hasThirdParty = ver.risk.reasons.some((r) => r.includes("Pagamento por terceiro"));
  const category = hasThirdParty ? "risco.elevado" : ver.subjectData.isCompany ? "beneficiario.efetivo" : "pep";
  return createQueueItem({
    id: id ?? `${ver.id}:aml`,
    queue: "COMPLIANCE",
    category,
    entityType: ver.subjectType === "SELLER" ? "USER" : "LISTING",
    subjectId: ver.subjectId,
    priority: "ALTA",
    nextStep: "Decisão AML (compliance ≠ verificador).",
    actorId: "system.workqueue",
    nowIso,
  });
}

/**
 * Reembolso → fila FINANCIAL. `checkRefundDeadline`:
 * SOLICITADO/EM_APROVACAO → reembolso.aprovacao; EM_PROCESSAMENTO → liquidação;
 * além do prazo → prioridade ALTA.
 */
export function refundToQueueItem(
  refund: Refund,
  nowIso: string,
  id?: string
): QueueResult {
  const overdue = nowIso >= refund.deadlineIso;
  if (refund.status === "REEMBOLSADO" || refund.status === "REJEITADO" || refund.status === "CANCELADO") {
    return { item: undefined };
  }
  const inProcessing = refund.status === "EM_PROCESSAMENTO";
  const category = inProcessing ? "reembolso.execucao" : "reembolso.aprovacao";
  return createQueueItem({
    id: id ?? refund.id,
    queue: "FINANCIAL",
    category,
    entityType: "REFUND",
    subjectId: refund.id,
    priority: overdue || inProcessing || refund.requiredApprovals === 2 ? "ALTA" : "MEDIA",
    nextStep: inProcessing ? "Liquidar com referência bancária." : "Completar aprovações four-eyes.",
    actorId: "system.workqueue",
    nowIso,
  });
}