// ---------------------------------------------------------------------------
// Verificação do VENDEDOR e do IMÓVEL/ANÚNCIO (spec v3 sec. 2/3/5, prioridade 4).
// O selo "verificado" só é dado com check-list documental completo e válido;
// risco alto (PEP/sanções/pagador terceiro) exige aprovação adicional de
// compliance com função DIFERENTE do verificador. Emite `OutboxEvent` para a
// BD (modelo `ListingEvent`) e o gate `canPublishCase` bloqueia a publicação
// (`listingStateMachine.ts` espera `publishApproved`). Determinístico e puro.
// ---------------------------------------------------------------------------

import { can } from "./accessPolicy.ts";
import type { OperatorRoleName } from "./accessPolicy.ts";

export type VerificationSubjectType = "SELLER" | "LISTING";

export type VerificationStatus =
  | "NOT_REQUESTED"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "NEEDS_MORE_INFO"
  | "VERIFIED"
  | "REJECTED";

/** Check result = o que a revisão humana confirmou depois do auto-check. */
export type CheckResult = "PENDING" | "PASS" | "FAIL" | "EXPIRED" | "INCOMPATIBLE";

export type RiskLevel = "NORMAL" | "ELEVATED" | "HIGH";

export interface RiskEnvelope {
  level: RiskLevel;
  reasons: string[];
}

export interface VerificationCheck {
  id: string;
  type: string; // "bi" | "title_deed" | "procura" | ...
  label: string;
  required: boolean;
  auto: CheckResult; // resultado determinístico por regras
  status: CheckResult; // decisão final (auto + revisão)
  note?: string;
  reviewedById?: string;
  reviewedAtIso?: string;
}

export interface VerificationCase {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string; // userId (SELLER) ou listingId (LISTING)
  listingId?: string;
  category?: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
  submittedBy: string;
  subjectData: SubjectData;
  risk: RiskEnvelope;
  amlApproved?: { approvedById: string; approverRole: OperatorRoleName; atIso: string };
  rejectedReason?: string;
  priority: "ALTA" | "MEDIA" | "BAIXA";
  createdAtIso: string;
  updatedAtIso: string;
  deadlineIso: string;
}

/** Dados declarados do sujeito (vendedor ou proprietário). */
export interface SubjectData {
  fullName: string;
  nif?: string;
  birthDateIso?: string;
  province?: string;
  isCompany: boolean;
  companyName?: string;
  sharesBreakdown?: Array<{ name: string; nif?: string; pct: number }>;
}

export interface DocumentSubmission {
  docId: string;
  type: string;
  sha256: string;
  issuedAtIso?: string;
  expiresAtIso?: string;
  holderName?: string;
  nif?: string;
  note?: string;
}

export interface RiskInput {
  thirdPartyPayer?: boolean;
  pepHit?: boolean;
  sanctionsHit?: boolean;
  sourceOfFundsDeclared?: boolean;
}

/** Check descrito para a fila de verificação. */
export interface VerificationOutboxEvent {
  type: "SUBMITTED" | "REVIEW_STARTED" | "NEEDS_MORE_INFO" | "APPROVED" | "REJECTED" | "BLOCKED";
  actorId: string;
  actorRole: string; // "SELLER" | "OPERATOR_VERIFIER" | "SYSTEM"
  ipAddress?: string;
  payload: Record<string, unknown>;
}

export interface VerificationResult {
  ver?: VerificationCase;
  error?: string;
  events?: VerificationOutboxEvent[];
}

/** Mapeamento a `ListingVerificationStatus` da BD (ligação futura). */
export const VERIFICATION_DB_MAP: Record<VerificationStatus, string> = {
  NOT_REQUESTED: "NOT_REQUESTED",
  SUBMITTED: "PENDING_DOCS",
  IN_REVIEW: "PENDING_DOCS",
  NEEDS_MORE_INFO: "PENDING_DOCS",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

/** Docs obrigatórios por categoria (a IA só ajuda; a lista é aprovada). */
export const REQUIRED_DOCS: Record<string, readonly string[]> = {
  IMOVEL: ["bi", "title_deed", "procura"],
  VENDA: ["bi", "title_deed"],
  TERRENO: ["bi", "title_deed"],
  PROJECTO: ["bi", "licenca_utilizacao"],
  DEFAULT: ["bi"],
};

const CHECK_LABELS: Record<string, string> = {
  bi: "Documento de identificação (BI/Passaporte)",
  title_deed: "Título de propriedade (registo predial)",
  procura: "Autorização/procuração para vender",
  licenca_utilizacao: "Licença de utilização",
};

// ---------------------------------------------------------------------------
// Helpers determinísticos (testáveis)
// ---------------------------------------------------------------------------

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function nifDigits(nif?: string): string {
  return (nif ?? "").replace(/\D/g, "");
}

export function nameMatches(subjectName: string, docHolderName?: string): boolean {
  if (!docHolderName) return true; // sem titular no doc não se pre-julga
  const s = normalizeName(subjectName);
  const d = normalizeName(docHolderName);
  return s === d || s.includes(d) || d.includes(s);
}

export function isExpiredAt(expiresAtIso: string, nowIso: string): boolean {
  return new Date(expiresAtIso).getTime() <= new Date(nowIso).getTime();
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Classificação de risco (descritiva; a decisão final é humana)
// ---------------------------------------------------------------------------

export function classifyRisk(input: RiskInput & SubjectData): RiskEnvelope {
  const reasons: string[] = [];
  if (input.thirdPartyPayer) reasons.push("Pagamento por terceiro (exceção AML).");
  if (input.pepHit) reasons.push("Correspondência PEP.");
  if (input.sanctionsHit) reasons.push("Correspondência em lista de sanções.");
  if (input.isCompany && (input.sharesBreakdown?.length ?? 0) > 1) {
    reasons.push("Sociedade com vários titularidades — confirmar beneficiário efetivo.");
  }
  if (input.isCompany && !input.sourceOfFundsDeclared) {
    reasons.push("Origem de fundos não declarada.");
  }
  const level: RiskLevel = reasons.length === 0 ? "NORMAL" : reasons.length === 1 ? "ELEVATED" : "HIGH";
  return { level, reasons };
}

// ---------------------------------------------------------------------------
// Auto-checks determinísticos — regras da spec (recusar e explicar porquê)
// ---------------------------------------------------------------------------

export function documentsDue(category: string | undefined, submitted: DocumentSubmission[]): string[] {
  const required = REQUIRED_DOCS[category ?? ""] ?? REQUIRED_DOCS.DEFAULT;
  return required.filter((t) => !submitted.some((d) => d.type === t));
}

export function runAutoChecks(
  category: string | undefined,
  subject: SubjectData,
  submitted: DocumentSubmission[],
  nowIso: string
): VerificationCheck[] {
  const required = REQUIRED_DOCS[category ?? ""] ?? REQUIRED_DOCS.DEFAULT;
  const checks: VerificationCheck[] = [];
  for (const type of required) {
    const label = CHECK_LABELS[type] ?? type;
    const docs = submitted.filter((d) => d.type === type);
    const base = { id: `${type}:check`, type, label, required: true };

    if (docs.length === 0) {
      checks.push({ ...base, auto: "PENDING", status: "PENDING", note: "Documento em falta." });
      continue;
    }
    // Duplicado com conteúdo divergente → bloquear (spec: teste de documento duplicado)
    const unique = new Set(docs.map((d) => d.sha256));
    if (docs.length > 1 && unique.size > 1) {
      checks.push({ ...base, auto: "INCOMPATIBLE", status: "INCOMPATIBLE", note: "Recibo mais de um documento com hash divergente para o mesmo tipo." });
      continue;
    }
    const doc = docs[0];
    let auto: CheckResult = "PASS";
    let note: string | undefined;
    if (doc.expiresAtIso && isExpiredAt(doc.expiresAtIso, nowIso)) {
      auto = "EXPIRED";
      note = "Documento expirado.";
    } else if (doc.holderName && !nameMatches(subject.fullName, doc.holderName)) {
      auto = "INCOMPATIBLE";
      note = "O titular do documento não corresponde ao vendedor.";
    } else if (doc.nif && subject.nif && nifDigits(doc.nif) !== nifDigits(subject.nif)) {
      auto = "INCOMPATIBLE";
      note = "NIF divergente entre documento e declaração.";
    }
    checks.push({ ...base, auto, status: auto, note });
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Fluxo
// ---------------------------------------------------------------------------

/** 1) Iniciar verificação: regista submissão, corre auto-checks e devolve outbox. */
export function startVerification(input: {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  listingId?: string;
  category?: string;
  submittedBy: string;
  actorRole: OperatorRoleName | "SYSTEM" | "SELLER";
  subjectData: SubjectData;
  documents: DocumentSubmission[];
  risk?: RiskInput;
  ipAddress?: string;
  nowIso?: string;
  deadlineDays?: number;
}): VerificationResult {
  if (!input.subjectId) return { error: "Sujeito em falta." };
  if (!input.subjectData.fullName.trim()) return { error: "Identificação do vendedor em falta." };

  const nowIso = input.nowIso ?? new Date().toISOString();
  const checks = runAutoChecks(input.category, input.subjectData, input.documents, nowIso);
  const missing = documentsDue(input.category, input.documents);
  const risk = classifyRisk({ ...input.risk, ...input.subjectData });

  const status: VerificationStatus = missing.length === 0 ? "SUBMITTED" : "NEEDS_MORE_INFO";
  const priority: "ALTA" | "MEDIA" | "BAIXA" = risk.level === "HIGH" ? "ALTA" : missing.length > 0 ? "MEDIA" : "BAIXA";

  const ver: VerificationCase = {
    id: input.id,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    listingId: input.listingId,
    category: input.category,
    status,
    checks,
    submittedBy: input.submittedBy,
    subjectData: input.subjectData,
    risk,
    priority,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    deadlineIso: addDays(nowIso, input.deadlineDays ?? 2),
  };

  const events: VerificationOutboxEvent[] = [
    { type: "SUBMITTED", actorId: input.submittedBy, actorRole: String(input.actorRole), ipAddress: input.ipAddress, payload: { subjectType: input.subjectType, subjectId: input.subjectId, missing } },
  ];
  if (status === "NEEDS_MORE_INFO") {
    events.push({ type: "NEEDS_MORE_INFO", actorId: "system.verification", actorRole: "SYSTEM", payload: { missing, reasons: risk.reasons } });
  }
  return { ver, events };
}

function requireVerifier(actorRole: OperatorRoleName): string | undefined {
  const ok = can({ operatorRole: actorRole }, "listings", "verify");
  return ok.allowed ? undefined : (ok.reason ?? "Sem permissão para verificar.");
}

/** 2) Decisão humana sobre um check (verificador). */
export function reviewCheck(
  ver: VerificationCase,
  input: { checkId: string; reviewerId: string; reviewerRole: OperatorRoleName; result: Extract<CheckResult, "PASS" | "FAIL" | "EXPIRED" | "INCOMPATIBLE">; note?: string; nowIso?: string }
): VerificationResult {
  const denied = requireVerifier(input.reviewerRole);
  if (denied) return { error: denied };

  if (ver.status === "VERIFIED" || ver.status === "REJECTED") {
    return { error: `Verificação ${ver.status.toLowerCase()}: já não se altera checks.` };
  }

  const idx = ver.checks.findIndex((c) => c.id === input.checkId);
  if (idx === -1) return { error: `Check desconhecido: ${input.checkId}` };

  const checks = ver.checks.map((c) =>
    c.id === input.checkId
      ? { ...c, status: input.result, note: input.note ?? c.note, reviewedById: input.reviewerId, reviewedAtIso: input.nowIso ?? new Date().toISOString() }
      : c
  );
  return {
    ver: { ...ver, checks, status: "IN_REVIEW", updatedAtIso: input.nowIso ?? new Date().toISOString() },
  };
}

/** 3) Pedir mais documentos (fila: NEEDS_MORE_INFO com prazo). */
export function requestMoreInfo(
  ver: VerificationCase,
  input: { byId: string; byRole: OperatorRoleName; note: string; nowIso?: string; deadlineDays?: number }
): VerificationResult {
  const denied = requireVerifier(input.byRole);
  if (denied) return { error: denied };
  if (!input.note.trim()) return { error: "Justifique o que falta." };
  if (ver.status === "VERIFIED" || ver.status === "REJECTED") return { error: "Verificação encerrada." };

  const nowIso = input.nowIso ?? new Date().toISOString();
  return {
    ver: { ...ver, status: "NEEDS_MORE_INFO", updatedAtIso: nowIso, deadlineIso: addDays(nowIso, input.deadlineDays ?? 2) },
    events: [{ type: "NEEDS_MORE_INFO", actorId: input.byId, actorRole: "OPERATOR_VERIFIER", payload: { note: input.note } }],
  };
}

/** 4) Re-submissão: volta a correr os auto-checks com os novos documentos. */
export function resubmitDocuments(
  ver: VerificationCase,
  input: { submittedBy: string; documents: DocumentSubmission[]; nowIso?: string }
): VerificationResult {
  if (ver.status === "VERIFIED" || ver.status === "REJECTED") return { error: "Verificação encerrada." };

  const nowIso = input.nowIso ?? new Date().toISOString();
  const checks = runAutoChecks(ver.category, ver.subjectData, input.documents, nowIso);
  const missing = documentsDue(ver.category, input.documents);
  const status: VerificationStatus = missing.length === 0 ? "SUBMITTED" : "NEEDS_MORE_INFO";
  return {
    ver: { ...ver, checks, status, updatedAtIso: nowIso },
    events: [{ type: "SUBMITTED", actorId: input.submittedBy, actorRole: "SELLER", payload: { missing } }],
  };
}

/**
 * 5) Aprovar selo "verificado". Regras:
 *   - todos os checks obrigatórios PASS (o bloqueio explica qual está por analisar);
 *   - risco HIGH exige aprovação AML de compliance diferente do verificador.
 */
export function approveCase(
  ver: VerificationCase,
  input: {
    approverId: string;
    approverRole: OperatorRoleName;
    nowIso?: string;
    ipAddress?: string;
    aml?: { approvedById: string; approverRole: OperatorRoleName } | null;
  }
): VerificationResult {
  const denied = requireVerifier(input.approverRole);
  if (denied) return { error: denied };
  if (ver.status === "VERIFIED") return { ver, error: "Já está verificada." };
  if (ver.status === "REJECTED") return { ver, error: "Rejeitada: não se aprova." };

  const blocked = ver.checks.filter((c) => c.status !== "PASS");
  if (blocked.length > 0) {
    return { ver, error: `Selos em falta: ${blocked.map((c) => `${c.label} (${c.status})`).join(", ")}.` };
  }
  if (ver.risk.level !== "HIGH") {
    return {
      ver: { ...ver, status: "VERIFIED", updatedAtIso: input.nowIso ?? new Date().toISOString(), amlApproved: undefined },
      events: [{ type: "APPROVED", actorId: input.approverId, actorRole: "OPERATOR_VERIFIER", ipAddress: input.ipAddress, payload: { riskLevel: ver.risk.level } }],
    };
  }

  // Risco alto: exige decisão AML de compliance com função diferente do verificador.
  if (!input.aml) return { ver, error: "Risco alto: falta a aprovação de compliance (aml.approve)." };
  const aml = can({ operatorRole: input.aml.approverRole }, "aml", "approve");
  if (!aml.allowed) return { ver, error: aml.reason ?? "Sem permissão AML." };
  if (input.aml.approverRole === "VERIFICADOR") {
    return { ver, error: "Máquina de risco: compliance tem de ser função diferente do verificador." };
  }
  const reviewerId = ver.checks.find((c) => c.reviewedById)?.reviewedById;
  if (reviewerId && input.aml.approvedById === reviewerId) {
    return { ver, error: "Four-eyes: quem verificou não pode aprovar o próprio risco alto." };
  }

  return {
    ver: {
      ...ver,
      status: "VERIFIED",
      updatedAtIso: input.nowIso ?? new Date().toISOString(),
      amlApproved: { approvedById: input.aml.approvedById, approverRole: input.aml.approverRole, atIso: input.nowIso ?? new Date().toISOString() },
    },
    events: [
      { type: "APPROVED", actorId: input.approverId, actorRole: "OPERATOR_VERIFIER", ipAddress: input.ipAddress, payload: { riskLevel: "HIGH" } },
    ],
  };
}

/** 6) Rejeição motivada. */
export function rejectCase(
  ver: VerificationCase,
  input: { byId: string; byRole: OperatorRoleName; reason: string; nowIso?: string; ipAddress?: string }
): VerificationResult {
  const denied = requireVerifier(input.byRole);
  if (denied) return { error: denied };
  if (!input.reason.trim()) return { error: "A rejeição exige o motivo." };
  if (ver.status === "VERIFIED") return { ver, error: "Não se rejeita uma verificação aprovada." };

  return {
    ver: { ...ver, status: "REJECTED", rejectedReason: input.reason.trim(), updatedAtIso: input.nowIso ?? new Date().toISOString() },
    events: [{ type: "REJECTED", actorId: input.byId, actorRole: "OPERATOR_VERIFIER", ipAddress: input.ipAddress, payload: { reason: input.reason.trim() } }],
  };
}

/** 7) Gate de publicação: o anúncio só sobe com selo válido. */
export function canPublishCase(ver: VerificationCase, nowIso: string): { ok: boolean; reason?: string } {
  if (ver.status !== "VERIFIED") return { ok: false, reason: `Anúncio não verificado (${ver.status}).` };
  if (new Date(nowIso).getTime() < new Date(ver.createdAtIso).getTime()) {
    return { ok: false, reason: "Relógio fora de ordem." };
  }
  const blocked = ver.checks.filter((c) => c.status !== "PASS");
  if (blocked.length > 0) {
    return { ok: false, reason: `Selos com estado inválido impedem a publicação: ${blocked.map((c) => `${c.label} (${c.status})`).join(", ")}.` };
  }
  return { ok: true };
}

/** 8) Fila: prazo ultrapassado → escalamento com próximo passo. */
export function checkVerificationDeadline(
  ver: VerificationCase,
  nowIso: string
): { escalated: boolean; nextStep?: string; reason?: string } {
  if (["VERIFIED", "REJECTED"].includes(ver.status)) return { escalated: false };
  if (nowIso >= ver.deadlineIso) {
    const pending = ver.checks.filter((c) => c.status !== "PASS");
    return {
      escalated: true,
      nextStep: pending.length > 0 ? "Pedir documentos em falta." : "Revisão pendente — atribuir verificador.",
      reason: "Prazo de verificação ultrapassado.",
    };
  }
  return { escalated: false };
}