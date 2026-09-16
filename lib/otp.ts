// OTP persistível e criptografado (spec v3 §5/§13). Determinístico com store
// injetável: em produção liga ao modelo `OtpCode` (schema Fase 1); nos testes
// usa a store em memória. O código limpo NUNCA é guardado — só o sha256.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export type OtpPurposeName =
  | "EMAIL_VERIFICATION"
  | "PHONE_VERIFICATION"
  | "MFA_PHONE"
  | "CHANGE_IBAN"
  | "RESET_PASSWORD"
  | "SELLER_CONFIRM_RECEIPT";

export interface OtpRecord {
  id: string;
  userId: string;
  purpose: OtpPurposeName;
  codeHash: string;
  expiresAtIso: string;
  attempts: number;
  consumedAtIso?: string | null;
  createdAtIso: string;
}

export interface OtpPayload {
  id: string;
  userId: string;
  purpose: OtpPurposeName;
  code: string; // transportado por canal externo (email/SMS/WhatsApp), nunca gravado
  expiresAtIso: string;
  attempts: number;
  createdAtIso: string;
}

export interface OtpStore {
  save(record: OtpRecord): void;
  findActive(userId: string, purpose: OtpPurposeName): OtpRecord | null;
  update(record: OtpRecord): void;
}

class MemoryOtpStore implements OtpStore {
  private byKey = new Map<string, OtpRecord>();
  private key(userId: string, purpose: OtpPurposeName) {
    return `${userId}:${purpose}`;
  }
  save(record: OtpRecord): void {
    this.byKey.set(this.key(record.userId, record.purpose), record);
  }
  findActive(userId: string, purpose: OtpPurposeName): OtpRecord | null {
    return this.byKey.get(this.key(userId, purpose)) ?? null;
  }
  update(record: OtpRecord): void {
    this.byKey.set(this.key(record.userId, record.purpose), record);
  }
}

const defaultStore = new MemoryOtpStore();

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_DEFAULT_TTL_MS = 10 * 60 * 1000;

function sha256Hex(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function randomDigits(digits: number): string {
  let out = "";
  for (let i = 0; i < digits; i++) out += String(randomInt(10));
  return out;
}

export interface IssueOtpInput {
  userId: string;
  purpose: OtpPurposeName;
  ttlMs?: number;
  digits?: number;
  now?: Date;
  store?: OtpStore;
  /** teste/demo: código fixo. Em produção omitir (aleatório seguro). */
  code?: string;
}

/**
 * Emite um OTP para (userId, purpose). Emitir um novo INVALIDA o anterior
 * (mesma chave na store) — impede reutilização e spam de códigos antigos.
 */
export function issueOtp(input: IssueOtpInput): OtpPayload {
  const now = input.now ?? new Date();
  const ttl = input.ttlMs ?? OTP_DEFAULT_TTL_MS;
  const code = input.code ?? randomDigits(input.digits ?? 6);
  const record: OtpRecord = {
    id: `${input.purpose}:${input.userId}:${now.getTime()}`,
    userId: input.userId,
    purpose: input.purpose,
    codeHash: sha256Hex(`${input.userId}:${input.purpose}:${code}`),
    expiresAtIso: new Date(now.getTime() + ttl).toISOString(),
    attempts: 0,
    createdAtIso: now.toISOString(),
  };
  (input.store ?? defaultStore).save(record);
  return {
    id: record.id,
    userId: record.userId,
    purpose: record.purpose,
    code,
    expiresAtIso: record.expiresAtIso,
    attempts: 0,
    createdAtIso: record.createdAtIso,
  };
}

export type OtpVerifyResult =
  | { ok: true; record: OtpRecord }
  | { ok: false; reason: "NOT_FOUND" | "WRONG_CODE" | "EXPIRED" | "MAX_ATTEMPTS" | "USED" };

export interface VerifyOtpInput {
  userId: string;
  purpose: OtpPurposeName;
  code: string;
  now?: Date;
  consume?: boolean;
  store?: OtpStore;
}

/** Verifica o OTP: tempo de vida, tentativas e igualdade do hash. */
export function verifyOtp(input: VerifyOtpInput): OtpVerifyResult {
  const now = input.now ?? new Date();
  const store = input.store ?? defaultStore;
  const record = store.findActive(input.userId, input.purpose);
  if (!record) return { ok: false, reason: "NOT_FOUND" };
  if (record.consumedAtIso) return { ok: false, reason: "USED" };
  if (new Date(record.expiresAtIso).getTime() < now.getTime()) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "MAX_ATTEMPTS" };
  }
  const expected = sha256Hex(`${input.userId}:${input.purpose}:${input.code}`);
  if (!hashesEqual(record.codeHash, expected)) {
    record.attempts += 1;
    store.update(record);
    return { ok: false, reason: "WRONG_CODE" };
  }
  if (input.consume !== false) {
    record.consumedAtIso = now.toISOString();
    store.update(record);
  }
  return { ok: true, record };
}

/** Consumo único: um OTP já consumido/exposto não pode voltar a passar. */
export function isOtpConsumed(record: OtpRecord): boolean {
  return Boolean(record.consumedAtIso);
}

export { sha256Hex as hashOtp };