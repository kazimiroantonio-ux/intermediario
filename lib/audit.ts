// ---------------------------------------------------------------------------
// Auditoria append-only (spec v3 sec. 5 "Logs e monitorização" + sec. 3 máquina
// de estados: estado anterior, utilizador, motivo, IP, aprovação, data/hora).
// Cada evento guarda o hash do evento anterior — alterar um registo antigo
// quebra a cadeia e é detetável. É puro (sem Prisma): a persistência é feita
// pelo serviço/schema `AuditEvent`; aqui só se constroem e verificam eventos.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

export type AuditActorType = "USER" | "OPERATOR" | "SYSTEM" | "AGENT" | "AI";

export const AUDIT_ACTOR_TYPES = ["USER", "OPERATOR", "SYSTEM", "AGENT", "AI"] as const;

/** Campos que um evento de auditoria deve sempre levar (append-only, verificável). */
export interface AuditEventInput {
  /** Identificador único da ocorrência (idempotência anti-duplicação). */
  occurrenceId: string;
  actorType: AuditActorType;
  actorId: string;
  /** Ação semântica, ex.: "login", "login.failed", "deal.transform", "refund.approved". */
  action: string;
  /** Tipologia da entidade, ex.: "deal", "listing", "document", "payment", "user". */
  domain: string;
  /** Id interno da entidade (nunca nomes/números introduzidos à mão). */
  entityId: string;
  reason?: string;
  ip?: string;
  device?: string;
  /** Dados estruturados (antes/depois, aprovações, etc.) — JSON-safe. */
  metadata?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  prevHash: string;
  hash: string;
  createdAtIso: string;
}

const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/** JSON determinístico: chaves ordenadas, BigInt como string, tipos primitivos. */
export function canonicalJson(value: unknown): string {
  if (typeof value === "bigint") return JSON.stringify(String(value));
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((k) => `${canonicalJson(k)}:${canonicalJson(record[k])}`)
      .join(",")}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return JSON.stringify(null);
  }
  return JSON.stringify(value);
}

export function hashAuditPayload(prevHash: string, input: AuditEventInput, createdAtIso: string): string {
  const payload = {
    prevHash,
    createdAtIso,
    data: {
      occurrenceId: input.occurrenceId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      domain: input.domain,
      entityId: input.entityId,
      reason: input.reason ?? "",
      ip: input.ip ?? "",
      device: input.device ?? "",
      metadata: input.metadata ?? {},
    },
  };
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

/** Cria um evento encadeado ao `prevHash` dado (ou início da cadeia). */
export function createAuditEvent(
  input: AuditEventInput,
  prevHash?: string,
  nowIso = new Date().toISOString()
): AuditEvent {
  const base: AuditEventInput = {
    occurrenceId: input.occurrenceId,
    actorType: input.actorType,
    actorId: input.actorId,
    action: input.action,
    domain: input.domain,
    entityId: input.entityId,
    reason: input.reason,
    ip: input.ip,
    device: input.device,
    metadata: input.metadata,
  };
  const chainFrom = prevHash ?? GENESIS_HASH;
  return {
    ...base,
    prevHash: chainFrom,
    createdAtIso: nowIso,
    hash: hashAuditPayload(chainFrom, base, nowIso),
  };
}

/** Verifica um único evento (hash e campos obrigatórios). */
export function verifyAuditEvent(event: AuditEvent): { ok: boolean; reason?: string } {
  if (!event.occurrenceId || !event.actorId || !event.action || !event.domain || !event.entityId) {
    return { ok: false, reason: "Campos obrigatórios em falta." };
  }
  if (!AUDIT_ACTOR_TYPES.includes(event.actorType)) {
    return { ok: false, reason: `ActorType inválido: ${event.actorType}` };
  }
  const recomputed = hashAuditPayload(event.prevHash, event as AuditEventInput, event.createdAtIso);
  if (recomputed !== event.hash) {
    return { ok: false, reason: "Hash não bate com o conteúdo do evento." };
  }
  return { ok: true };
}

/**
 * Verifica a cadeia completa: ordem, encadeamento e ausência de duplicados.
 * `events` deve estar ordenado cronologicamente (append-only).
 */
export function verifyAuditChain(events: AuditEvent[]): {
  ok: boolean;
  brokenAt?: number;
  reason?: string;
} {
  const seen = new Set<string>();
  let prev = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (seen.has(e.occurrenceId)) {
      return { ok: false, brokenAt: i, reason: `occurrenceId duplicado no índice ${i}.` };
    }
    seen.add(e.occurrenceId);
    if (e.prevHash !== prev) {
      return { ok: false, brokenAt: i, reason: `Cadeia quebrada no índice ${i}: prevHash não corresponde.` };
    }
    const v = verifyAuditEvent(e);
    if (!v.ok) {
      return { ok: false, brokenAt: i, reason: v.reason };
    }
    prev = e.hash;
  }
  return { ok: true };
}