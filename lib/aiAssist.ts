// ---------------------------------------------------------------------------
// (Prioridade 10) IA — Fase 5, guarda-redor determinística sobre o núcleo.
// A IA sugere; nunca executa por si. Regras: (a) contacto/IBAN/sites fora do
// anúncio; (b) cláusulas de contrato só a partir de templates aprovados;
// (c) valores monetários só aceites se baterem a comissão 30/70 (determinística);
// (d) toda a ação é registada (espelho de `AiAction` do schema) e tem de ser
// aprovada por humano antes de "aplicar".
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

export type AiOutcome = "SUGGESTED" | "APPROVED" | "REJECTED" | "BLOCKED" | "FAILED";
export type AiOperation = "extract" | "compare" | "scan" | "suggest" | "classify" | "explain";

export interface AiActionRecord {
  id: string; // idempotente: `${model}:${inputHash}:${operation}`
  operation: AiOperation;
  model: string;
  modelVersion: string;
  inputHash: string; // sha256 das entradas — nunca o conteúdo bruto
  dealId?: string;
  listingId?: string;
  outcome: Record<string, unknown>; // sugestão/vars extraídas (só o que se aplica)
  confidence: number; // 0..1
  promptHash: string;
  status: AiOutcome;
  suggestedById?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedAt?: string;
  blockedReasons: string[];
  appliedChanges?: Array<{ entity: string; field: string; from?: string; to: string }>;
  createdAtIso: string;
}

/** Hash estável das entradas (nunca guarda conteúdo bruto). */
export function hashInput(...parts: Array<string | undefined>): string {
  return createHash("sha256").update(parts.filter(Boolean).join("\u0000")).digest("hex");
}

export function hashPrompt(template: string, params: Record<string, string>): string {
  const canonical = Object.keys(params)
    .filter((k) => params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha256").update(`${template}\u0000${canonical}`).digest("hex");
}

// --- (a) Sanitização de texto sugerido para anúncio -------------------------
const PHONE_RE = /(\+?\d{9,12}|\d{3}[ ]?\d{3}[ ]?\d{3})/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /(https?:\/\/|www\.)[^\s]+/g;
const IBAN_RE = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,}\b/gi;
const NIF_ANUNCIO_RE = /\b\d{9,12}\b/g; // NIF/telemóvel longos — fora do anúncio aberto

export function sanitizeAdText(raw: string): { cleaned: string; blocked: string[] } {
  const blocked: string[] = [];
  const checks: Array<[RegExp[], string]> = [
    [[PHONE_RE, NIF_ANUNCIO_RE], "Informação de contacto no anúncio."],
    [[EMAIL_RE], "Email no anúncio."],
    [[URL_RE], "Link/site no anúncio."],
    [[IBAN_RE], "Dados bancários no anúncio."],
  ];
  for (const [res, msg] of checks) {
    if (res.some((re) => re.test(raw))) blocked.push(msg);
  }
  const cleaned = raw
    .replace(PHONE_RE, "")
    .replace(EMAIL_RE, "")
    .replace(URL_RE, "")
    .replace(NIF_ANUNCIO_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  return { cleaned, blocked };
}

// --- (b) Cláusulas de contrato só de templates aprovados ---------------------
export function assessContractClause(
  clauseText: string,
  allowedTemplateClauses: readonly string[]
): { outcome: AiOutcome; reason?: string } {
  const text = clauseText.toLowerCase().trim();
  if (!text) return { outcome: "BLOCKED", reason: "Cláusula vazia." };
  const match = allowedTemplateClauses.find((c) => c.toLowerCase() === text);
  if (match) return { outcome: "SUGGESTED" };
  const financial = /(comiss[ãa]o|honor[aá]rio|percentagem|garantia|juros|multa|\d+\s*%)/i.test(text);
  if (financial) {
    return { outcome: "BLOCKED", reason: "Cláusula monetária fora do template aprovado (fins apenas pelo contrato tipo)." };
  }
  return { outcome: "BLOCKED", reason: "Cláusula fora dos templates aprovados — usar o motor documental." };
}

// --- (c) Valores só se baterem a comissão 30/70 ------------------------------
export function assessAmountAgainstCommission(input: {
  suggestedCents: bigint;
  expectedCents: bigint; // valor determinístico calculado pelo núcleo
  toleranceCents?: bigint;
}): { outcome: AiOutcome; reason?: string } {
  const tol = input.toleranceCents ?? 1n;
  if (input.suggestedCents <= 0n || input.expectedCents <= 0n) {
    return { outcome: "BLOCKED", reason: "Valor inválido." };
  }
  const diff = input.suggestedCents > input.expectedCents ? input.suggestedCents - input.expectedCents : input.expectedCents - input.suggestedCents;
  if (diff <= tol) return { outcome: "SUGGESTED" };
  return {
    outcome: "BLOCKED",
    reason: `A IA sugeriu ${input.suggestedCents.toString()} Kz mas a comissão determinística é ${input.expectedCents.toString()} Kz (${diff.toString()} de diferença).`,
  };
}

// --- (d) Registo idempotente (espelho de `AiAction`) -------------------------
export function logAiAction(input: {
  operation: AiOperation;
  model: string;
  modelVersion: string;
  inputHash: string;
  prompt?: string;
  promptParams?: Record<string, string>;
  outcome: Record<string, unknown>;
  confidence: number;
  suggestedById?: string;
  dealId?: string;
  listingId?: string;
  status?: AiOutcome;
  blockedReasons?: string[];
  nowIso?: string;
}): AiActionRecord | { error: string } {
  if (!input.inputHash) return { error: "inputHash em falta (nunca guardes o conteúdo bruto)." };
  if (input.confidence < 0 || input.confidence > 1) return { error: "Confiança fora de 0..1." };
  const createdAtIso = input.nowIso ?? new Date().toISOString();
  const promptHash = input.prompt ? hashPrompt(input.prompt, input.promptParams ?? {}) : "";
  const id = `${input.model}:${input.inputHash}:${input.operation}`;
  return {
    id,
    operation: input.operation,
    model: input.model,
    modelVersion: input.modelVersion,
    inputHash: input.inputHash,
    dealId: input.dealId,
    listingId: input.listingId,
    outcome: input.outcome,
    confidence: input.confidence,
    promptHash,
    status: input.status ?? "SUGGESTED",
    suggestedById: input.suggestedById,
    blockedReasons: input.blockedReasons ?? [],
    createdAtIso,
  };
}

/** Aprovação humana — só de SUGGESTED; idempotente. */
export function approveAiAction(
  action: AiActionRecord,
  input: { approvedById: string; nowIso?: string }
): AiActionRecord | { error: string } {
  if (action.status === "APPROVED") return { error: "Já aprovado." };
  if (action.status === "BLOCKED") return { error: "Ação bloqueada pela guarda-redes — não é aprovável." };
  if (action.status !== "SUGGESTED") return { error: `Só sugestões pendentes são aprovadas (estado: ${action.status}).` };
  return {
    ...action,
    status: "APPROVED",
    approvedById: input.approvedById,
    approvedAt: input.nowIso ?? new Date().toISOString(),
  };
}

export function rejectAiAction(
  action: AiActionRecord,
  input: { rejectedById: string; nowIso?: string }
): AiActionRecord | { error: string } {
  if (action.status !== "SUGGESTED") return { error: "Só sugestões pendentes são recusadas." };
  return {
    ...action,
    status: "REJECTED",
    rejectedById: input.rejectedById,
    rejectedAt: input.nowIso ?? new Date().toISOString(),
  };
}

/** Aplica as mudanças só após aprovação humana (grava o diff). */
export function applyChanges(
  action: AiActionRecord,
  changes: Array<{ entity: string; field: string; from?: string; to: string }>
): AiActionRecord | { error: string } {
  if (action.status !== "APPROVED") return { error: "Mudanças só podem ser aplicadas a sugestões aprovadas." };
  return { ...action, appliedChanges: changes };
}