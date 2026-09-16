// ---------------------------------------------------------------------------
// (Prioridade 8) Notificações multicanal — roteamento por preferências do
// destinatário, dedupe por evento, entregas com tentativas/backoff e trinco de
// segurança (eventos de autenticação ignoram preferências).
// Determinística: `nowIso` sempre explícito; sem acesso de rede neste módulo.
// ---------------------------------------------------------------------------

export type NotificationChannel = "EMAIL" | "SMS" | "PUSH" | "APP";

export type NotificationEventType =
  | "NEGOCIO_UPDATE"
  | "DOCUMENTO_NOVO"
  | "DOCUMENTO_ASSINADO"
  | "DOCUMENTO_REJEITADO"
  | "PAGAMENTO_PEDIDO"
  | "PAGAMENTO_RECEBIDO"
  | "PAGAMENTO_ENVIADO"
  | "REEMBOLSO"
  | "REUNIAO_AGENDADA"
  | "VERIFICACAO"
  | "ATRASO"
  | "SEGURANCA"; // 2FA / login novo / alteração sensível — sempre EMAIL

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "SUPPRESSED" | "DELIVERED" | "READ";

export interface UserNotificationPrefs {
  /** Desativa TODOS os canais; canais extra mapeados abaixo. */
  disabled?: boolean;
  channels: Partial<Record<NotificationChannel, boolean>>;
}

/** Canais por defeito por evento (quando o utilizador não desativou). */
export const DEFAULT_CHANNELS: Record<NotificationEventType, readonly NotificationChannel[]> = {
  NEGOCIO_UPDATE: ["EMAIL", "APP"],
  DOCUMENTO_NOVO: ["EMAIL", "APP"],
  DOCUMENTO_ASSINADO: ["EMAIL", "APP"],
  DOCUMENTO_REJEITADO: ["EMAIL", "APP"],
  PAGAMENTO_PEDIDO: ["EMAIL", "SMS", "APP"],
  PAGAMENTO_RECEBIDO: ["EMAIL", "SMS", "APP"],
  PAGAMENTO_ENVIADO: ["EMAIL", "APP"],
  REEMBOLSO: ["EMAIL", "SMS"],
  REUNIAO_AGENDADA: ["EMAIL", "APP"],
  VERIFICACAO: ["EMAIL", "APP"],
  ATRASO: ["EMAIL", "SMS"],
  SEGURANCA: ["EMAIL"],
};

export interface NotificationOutbound {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body: string;
  referenceId: string; // id do negócio/documento/pagamento — para dedupe
  status: NotificationStatus;
  dedupeKey: string; // sha-like `${userId}:${referenceId}:${eventType}:${channel}`
  scheduledForIso: string;
  attempt: number;
  nextAttemptAtIso?: string;
  sentAtIso?: string;
  readAtIso?: string;
  createdAtIso: string;
}

export interface DispatchError {
  userId?: string;
  referenceId?: string;
  eventType?: NotificationEventType;
  error?: string;
}

export interface DispatchResult {
  outbound: NotificationOutbound[];
  suppressed: NotificationOutbound[];
  errors: DispatchError[];
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Backoff: 5min → 30min → 2h → 8h; falha permanente = última por agora. */
export const RETRY_BACKOFF_MINUTES = [5, 30, 120, 480, 1440];

export function notificationDedupeKey(userId: string, referenceId: string, eventType: NotificationEventType, channel: NotificationChannel): string {
  return `${userId}:${referenceId}:${eventType}:${channel}`;
}

/** Seleciona os canais de um evento respeitando preferências e jogos de trinco. */
export function channelsFor(
  eventType: NotificationEventType,
  prefs: UserNotificationPrefs
): NotificationChannel[] {
  if (eventType === "SEGURANCA") return ["EMAIL"]; // trinco: segurança ignora prefs
  if (prefs.disabled) return [];
  return (DEFAULT_CHANNELS[eventType] ?? []).filter((c) => prefs.channels?.[c] !== false);
}

/**
 * Prepara notificações para um destinatário. Se `alreadySent` tiver a mesma
 * dedupeKey dentro da janela (padrão 1h), não reenvia (batimento do coração).
 */
export function dispatchNotification(input: {
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  referenceId: string;
  prefs: UserNotificationPrefs;
  nowIso?: string;
  dedupeWindowMinutes?: number;
  alreadySent?: NotificationOutbound[];
  scheduleAtIso?: string;
}): DispatchResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const channels = channelsFor(input.eventType, input.prefs);
  const outbound: NotificationOutbound[] = [];
  const suppressed: NotificationOutbound[] = [];
  const errors: DispatchError[] = [];
  const windowMs = (input.dedupeWindowMinutes ?? 60) * 60_000;

  for (const channel of channels) {
    const key = notificationDedupeKey(input.userId, input.referenceId, input.eventType, channel);
    const dupe = (input.alreadySent ?? []).some(
      (n) => n.dedupeKey === key && new Date(nowIso).getTime() - new Date(n.createdAtIso).getTime() < windowMs
    );
    if (dupe) {
      suppressed.push({
        id: `${key}:dup`,
        userId: input.userId,
        eventType: input.eventType,
        channel,
        title: input.title,
        body: input.body,
        referenceId: input.referenceId,
        status: "SUPPRESSED",
        dedupeKey: key,
        scheduledForIso: nowIso,
        attempt: 0,
        createdAtIso: nowIso,
      });
      continue;
    }
    outbound.push({
      id: `${key}:${nowIso}`,
      userId: input.userId,
      eventType: input.eventType,
      channel,
      title: input.title.trim(),
      body: input.body.trim(),
      referenceId: input.referenceId,
      status: "PENDING",
      dedupeKey: key,
      scheduledForIso: input.scheduleAtIso ?? nowIso,
      attempt: 0,
      createdAtIso: nowIso,
    });
  }

  // Conteúdo vazio em canais úteis é erro de montagem, não silencia a notificação.
  if (errors.length === 0 && outbound.length === 0 && !input.prefs.disabled) {
    return { outbound, suppressed, errors: [{ userId: input.userId, referenceId: input.referenceId, eventType: input.eventType, error: "Sem canais ativos para o evento." }] };
  }
  return { outbound, suppressed, errors };
}

/** Marca entrega; falha → próxima tentativa com backoff. */
export function recordAttempt(
  n: NotificationOutbound,
  input: { ok: boolean; nowIso?: string; error?: string }
): NotificationOutbound {
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (input.ok) return { ...n, status: "SENT", sentAtIso: nowIso, attempt: n.attempt + 1, nextAttemptAtIso: undefined };
  const next = RETRY_BACKOFF_MINUTES[n.attempt];
  return {
    ...n,
    status: "FAILED",
    attempt: n.attempt + 1,
    nextAttemptAtIso: next === undefined ? undefined : addMinutes(nowIso, next),
  };
}

/** Confirma leitura (APP) ou entrega em outro canal (EMAIL/SMS/PUSH). */
export function confirmDelivery(n: NotificationOutbound, input: { nowIso?: string; kind?: "DELIVERED" | "READ" }): NotificationOutbound {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const kind = input.kind ?? "DELIVERED";
  return kind === "READ" ? { ...n, status: "READ", readAtIso: nowIso } : { ...n, status: "DELIVERED" };
}

/** Fila de tentativas: notificações PENDING/FAILED com próxima hora devida. */
export function pendingForRetry(items: NotificationOutbound[], nowIso: string): NotificationOutbound[] {
  return items.filter(
    (n) => (n.status === "PENDING" || (n.status === "FAILED" && n.nextAttemptAtIso && nowIso >= n.nextAttemptAtIso))
  );
}