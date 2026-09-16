// Atividades da conta única (spec v3 §3): o utilizador é comprador E vendedor;
// o contexto é dado pela atividade. `side` (BUYER/SELLER) alimenta o seletor
// [Todas | Como comprador | Como vendedor] do painel.
export type ActivityTypeName = "BUYING" | "SELLING" | "VISITING" | "INVESTIGATING";
export type ActivitySideName = "BUYER" | "SELLER";
export type ActivityStatusName = "OPEN" | "COMPLETED" | "CANCELLED";

export interface UserActivity {
  id: string;
  userId: string;
  activityType: ActivityTypeName;
  side: ActivitySideName;
  status: ActivityStatusName;
  transactionId?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAtIso: string;
}

/**
 * Contexto padrão por tipo: visitar e investigar são comportamentos de quem
 * compra; publicar/vender é do lado do vendedor. As transações reais definem
 * o side definitivo do negócio.
 */
export const DEFAULT_SIDE_FOR: Record<ActivityTypeName, ActivitySideName> = {
  BUYING: "BUYER",
  SELLING: "SELLER",
  VISITING: "BUYER",
  INVESTIGATING: "BUYER",
};

export const ACTIVITY_TYPES: ActivityTypeName[] = [
  "BUYING",
  "SELLING",
  "VISITING",
  "INVESTIGATING",
];

export interface ActivityStore {
  save(activity: UserActivity): void;
  list(userId: string): UserActivity[];
}

class MemoryActivityStore implements ActivityStore {
  private byUser = new Map<string, UserActivity[]>();
  save(activity: UserActivity): void {
    const list = this.byUser.get(activity.userId) ?? [];
    list.push(activity);
    this.byUser.set(activity.userId, list);
  }
  list(userId: string): UserActivity[] {
    return this.byUser.get(userId) ?? [];
  }
}

const defaultStore = new MemoryActivityStore();

export interface RecordActivityInput {
  userId: string;
  activityType: ActivityTypeName;
  side?: ActivitySideName;
  status?: ActivityStatusName;
  transactionId?: string | null;
  listingId?: string | null;
  metadata?: Record<string, unknown> | null;
  now?: Date;
  store?: ActivityStore;
}

/**
 * Regista uma atividade na conta única. O lado não pode contradizer o tipo:
 * uma atividade BUYING é sempre de comprador; SELLING de vendedor. VISITING e
 * INVESTIGATING são do lado comprador por omissão.
 */
export function recordActivity(input: RecordActivityInput): UserActivity {
  const now = input.now ?? new Date();
  const side = input.side ?? DEFAULT_SIDE_FOR[input.activityType];
  const forbidden = DEFAULT_SIDE_FOR[input.activityType];
  if (forbidden === "BUYER" && side === "SELLER") {
    throw new Error(`ATIVIDADE_${input.activityType}_NAO_PODE_SER_VENDEDOR`);
  }
  if (forbidden === "SELLER" && side === "BUYER") {
    throw new Error(`ATIVIDADE_${input.activityType}_NAO_PODE_SER_COMPRADOR`);
  }
  const activity: UserActivity = {
    id: `${input.activityType}:${input.userId}:${now.getTime()}`,
    userId: input.userId,
    activityType: input.activityType,
    side,
    status: input.status ?? "OPEN",
    transactionId: input.transactionId ?? null,
    listingId: input.listingId ?? null,
    metadata: input.metadata ?? null,
    createdAtIso: now.toISOString(),
  };
  (input.store ?? defaultStore).save(activity);
  return activity;
}

export interface ListActivitiesFilter {
  userId: string;
  side?: ActivitySideName | "ALL";
  activityType?: ActivityTypeName | "ALL";
  status?: ActivityStatusName;
  limit?: number;
  before?: string; // ISO — paginação (atividades anteriores)
  store?: ActivityStore;
}

/**
 * Lista atividades ordenadas da mais recente para a mais antiga, com o
 * filtro de contexto do seletor [Todas | Como comprador | Como vendedor].
 */
export function listActivities(filter: ListActivitiesFilter): UserActivity[] {
  const store = filter.store ?? defaultStore;
  const side = filter.side ?? "ALL";
  const type = filter.activityType ?? "ALL";
  const limit = filter.limit ?? 100;
  const beforeMs = filter.before ? new Date(filter.before).getTime() : Number.POSITIVE_INFINITY;

  return store
    .list(filter.userId)
    .filter((a) => (side === "ALL" ? true : a.side === side))
    .filter((a) => (type === "ALL" ? true : a.activityType === type))
    .filter((a) => (filter.status ? a.status === filter.status : true))
    .filter((a) => new Date(a.createdAtIso).getTime() < beforeMs)
    .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
    .slice(0, limit);
}

export interface ActivitiesSummary {
  total: number;
  buyer: number;
  seller: number;
  byType: Record<ActivityTypeName, number>;
  byStatus: Record<ActivityStatusName, number>;
}

/** Resumo do painel: quantas atividades como comprador e como vendedor. */
export function activitiesSummary(userId: string, store?: ActivityStore): ActivitiesSummary {
  const all = (store ?? defaultStore).list(userId);
  const summary: ActivitiesSummary = {
    total: all.length,
    buyer: all.filter((a) => a.side === "BUYER").length,
    seller: all.filter((a) => a.side === "SELLER").length,
    byType: { BUYING: 0, SELLING: 0, VISITING: 0, INVESTIGATING: 0 },
    byStatus: { OPEN: 0, COMPLETED: 0, CANCELLED: 0 },
  };
  for (const a of all) {
    summary.byType[a.activityType] += 1;
    summary.byStatus[a.status] += 1;
  }
  return summary;
}

/** Transições de estado de uma atividade (nunca voltar de COMPLETED/CANCELLED). */
export function transitionActivityStatus(
  activity: UserActivity,
  to: ActivityStatusName
): UserActivity {
  const next =
    activity.status === "OPEN"
      ? to
      : activity.status === "COMPLETED" && to === "CANCELLED"
        ? "CANCELLED"
        : activity.status;
  if (next === activity.status && to !== activity.status) {
    throw new Error(`ATIVIDADE_EM_${activity.status}_NAO_MUDA_PARA_${to}`);
  }
  return { ...activity, status: next };
}