// ---------------------------------------------------------------------------
// Workflow documental (MVP da plataforma documental — sec. 10).
// Orquestra: rascunho → revisão humana → envio → leitura → consentimento → OTP
// → assinatura → auditoria, e os gates que BLOQUEIAM o negócio quando falta
// uma assinatura/autorização (a IA prepara e verifica; pessoas aprovam; o
// sistema impede o avanço sem provas).
// Puro: injeta repositórios (portas) — as rotas ligam adaptadores Prisma.
// ---------------------------------------------------------------------------

import {
  renderTemplate,
  checkRules,
  thirdPartyPayerGate,
} from "./documentEngine.ts";

import type {
  DocumentTypeName,
  DocumentVars,
  RuleContext,
} from "./documentEngine.ts";

export type DealDocumentStatusName =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "SENT"
  | "READ"
  | "SIGNED"
  | "REJECTED"
  | "EXPIRED"
  | "VOID"
  | "SUPERSEDED";

export type SignatureMethodName = "OTP_SMS" | "ELECTRONIC" | "QUALIFIED";

export interface TemplateRecord {
  code: string;
  docType: DocumentTypeName;
  revision: number;
  content: string;
  varsSchema: string[];
  signatureRequirement: "DIGITAL_SUFFICIENT" | "QUALIFIED_REQUIRED" | "EXTERNAL_FORMALIZATION";
  requiresHumanReview: boolean;
  riskLevel: 1 | 2 | 3;
}

export interface DealDocumentRecord {
  id: string;
  dealId: string;
  templateId: string;
  revision: number;
  docType: DocumentTypeName;
  status: DealDocumentStatusName;
  title: string;
  variables: DocumentVars;
  alerts: string[];
  bodyHash: string | null;
  fileUrl?: string | null;
  requiresHumanReview: boolean;
  signatureRequirement: TemplateRecord["signatureRequirement"];
  generatedById?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  consentUrl?: string | null;
  consentExpiresAt?: string | null;
  signedAt?: string | null;
  voidReason?: string | null;
  createdAtIso?: string;
}

export interface SignatureRecord {
  id: string;
  documentId: string;
  signerId?: string | null;
  signerRole: string;
  method: SignatureMethodName;
  consentAt?: string | null;
  otpVerifiedAt?: string | null;
  otpExpiresAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceData?: string | null;
  signedAt?: string | null;
  certificateReference?: string | null;
  documentHash: string | null;
}

export interface EventRecord {
  documentId: string;
  type: string;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  payload?: unknown;
}

export interface DocumentRepository {
  getDocument(id: string): Promise<DealDocumentRecord | null>;
  updateDocument(id: string, patch: Partial<DealDocumentRecord>): Promise<void>;
  createSignature(sig: Omit<SignatureRecord, "id">): Promise<SignatureRecord>;
  updateSignature(id: string, patch: Partial<Omit<SignatureRecord, "id" | "documentId">>): Promise<void>;
  getSignatures(documentId: string): Promise<SignatureRecord[]>;
  createEvent(evt: EventRecord): Promise<void>;
}

export class WorkflowError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// 1) Rascunho: dados do negócio + modelo aprovado → corpo + hash + alertas.
// Campos em falta não rebentam o rascunho — ficam como alerts (bloqueio).
// ---------------------------------------------------------------------------

export interface DraftInput {
  template: TemplateRecord;
  vars: DocumentVars;
  ruleContext: RuleContext;
  dealId: string;
  generatedById?: string | null;
  title?: string;
}

export function createDraft(input: DraftInput): DealDocumentRecord {
  const alerts: string[] = checkRules(input.template.docType, input.ruleContext);
  let bodyHash: string | null = null;

  try {
    const rendered = renderTemplate(input.template.content, input.vars, input.template.varsSchema);
    bodyHash = rendered.fileHash;
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "MISSING_VARS") {
      const details = (err as unknown as { details?: string[] }).details ?? [];
      alerts.push(...details.map((d) => `(rendering) ${d}`));
    } else {
      throw new WorkflowError("RENDER_FAILED", `Falha ao gerar o documento: ${(err as Error).message}`);
    }
  }

  return {
    id: genId("DOC"),
    dealId: input.dealId,
    templateId: input.template.code,
    revision: input.template.revision,
    docType: input.template.docType,
    status: "DRAFT",
    title: input.title ?? input.template.code,
    variables: input.vars,
    alerts,
    bodyHash,
    requiresHumanReview: input.template.requiresHumanReview,
    signatureRequirement: input.template.signatureRequirement,
    generatedById: input.generatedById,
    createdAtIso: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// 2) Revisão humana (obrigatória nos de alto risco; padrão antes do envio).
// ---------------------------------------------------------------------------

export async function requestReview(repo: DocumentRepository, documentId: string, byId: string): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["DRAFT"], "RequestReview");
  await repo.updateDocument(documentId, { status: "PENDING_REVIEW" });
  await repo.createEvent({ documentId, type: "REVIEW_REQUESTED", actorId: byId, actorRole: "AGENT" });
}

export async function approveReview(
  repo: DocumentRepository,
  documentId: string,
  reviewerId: string,
  reviewerRole: string
): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["PENDING_REVIEW", "DRAFT", "APPROVED"], "ApproveReview");
  await repo.updateDocument(documentId, {
    status: "APPROVED",
    reviewedById: reviewerId,
    reviewedAt: nowIso(),
  });
  await repo.createEvent({ documentId, type: "REVIEWED", actorId: reviewerId, actorRole: reviewerRole });
}

// ---------------------------------------------------------------------------
// 3) Envio: link seguro com expiração (nunca download para não autorizados).
// ---------------------------------------------------------------------------

export async function sendForSignature(
  repo: DocumentRepository,
  documentId: string,
  actorId: string,
  opts: { consentUrl: string; expiresInHours?: number } = { consentUrl: genId("LINK") }
): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["APPROVED"], "SendForSignature");
  if (doc.alerts.length > 0) {
    throw new WorkflowError("BLOCKED_ALERTS", "O documento tem alertas pendentes — resolver antes do envio.");
  }
  const hours = opts.expiresInHours ?? 72;
  await repo.updateDocument(documentId, {
    status: "SENT",
    consentUrl: opts.consentUrl,
    consentExpiresAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
  });
  await repo.createEvent({ documentId, type: "SENT", actorId, actorRole: "AGENT" });
}

export async function confirmRead(repo: DocumentRepository, documentId: string, actorId: string): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["SENT"], "ConfirmRead");
  await repo.updateDocument(documentId, { status: "READ" });
  await repo.createEvent({ documentId, type: "OPENED", actorId, actorRole: "PARTY" });
}

// ---------------------------------------------------------------------------
// 4) Consentimento + OTP + assinatura. Depois de SIGNED o hash fica selado.
// ---------------------------------------------------------------------------

export async function issueConsent(
  repo: DocumentRepository,
  documentId: string,
  signer: { signerId?: string | null; signerRole: string; otpExpiresAt?: string }
): Promise<SignatureRecord> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["SENT", "READ"], "IssueConsent");
  return repo.createSignature({
    documentId,
    signerId: signer.signerId ?? null,
    signerRole: signer.signerRole,
    method: "OTP_SMS",
    consentAt: nowIso(),
    otpExpiresAt: signer.otpExpiresAt ?? new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    documentHash: null,
  });
}

export interface SignatureCompletion {
  signerId?: string | null;
  signerRole: string;
  otpVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceData?: string;
  certificateReference?: string;
}

export async function completeSignature(repo: DocumentRepository, documentId: string, input: SignatureCompletion): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  if (doc.status === "SIGNED") {
    throw new WorkflowError("ALREADY_SIGNED", "Este documento já foi assinado.");
  }
  assertStatus(doc, ["SENT", "READ"], "CompleteSignature");
  if (doc.bodyHash === null) {
    throw new WorkflowError("NO_HASH", "Documento sem hash — impossível assinar (modelo não gerado).");
  }

  const sigs = await repo.getSignatures(documentId);
  if (sigs.some((s) => s.signerRole === input.signerRole && s.signedAt)) {
    throw new WorkflowError("ALREADY_SIGNED", "Este documento já foi assinado por este signatário.");
  }
  const mine = sigs.find((s) => s.signerRole === input.signerRole && !s.signedAt);
  if (!mine) {
    throw new WorkflowError("NO_CONSENT", "Sem consentimento registado para este signatário.");
  }
  if (mine.otpExpiresAt && new Date(mine.otpExpiresAt).getTime() < Date.now()) {
    throw new WorkflowError("OTP_EXPIRED", "Código OTP expirado.");
  }
  if (!input.otpVerified) {
    throw new WorkflowError("OTP_UNVERIFIED", "OTP não verificado — assinatura recusada.");
  }

  const signedAt = nowIso();
  await repo.updateDocument(documentId, { status: "SIGNED", signedAt });
  await repo.updateSignature(mine.id, {
    signerId: input.signerId ?? null,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    deviceData: input.deviceData,
    certificateReference: input.certificateReference,
    signedAt,
    documentHash: doc.bodyHash,
  });
  await repo.createEvent({
    documentId,
    type: "SIGNED",
    actorId: input.signerId ?? null,
    actorRole: input.signerRole,
    ipAddress: input.ipAddress,
    payload: { documentHash: doc.bodyHash },
  });
}

// ---------------------------------------------------------------------------
// 5) Recusa / revogação.
// ---------------------------------------------------------------------------

export async function rejectDocument(repo: DocumentRepository, documentId: string, actorId: string, reason: string): Promise<void> {
  const doc = await mustLoad(repo, documentId);
  assertStatus(doc, ["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "READ"], "RejectDocument");
  await repo.updateDocument(documentId, { status: "REJECTED", voidReason: reason });
  await repo.createEvent({ documentId, type: "REJECTED", actorId, actorRole: "COMPLIANCE", payload: { reason } });
}

// ---------------------------------------------------------------------------
// Gates de bloqueio do negócio (sec. 3/8): AGREED e DEPOSIT.
// ---------------------------------------------------------------------------

export interface ThirdPartySignedContext {
  amlApproved: boolean;
  buyerIdentified: boolean;
  sellerIdentified: boolean;
  agreementOtpsComplete: boolean;
}

/**
 * Bloqueios para aceitar AGREED: precisa do contrato de mediação assinado +
 * OTPs das duas partes.
 */
export function gateToAgreed(documents: DealDocumentRecord[], ctx: ThirdPartySignedContext): string[] {
  const blockers: string[] = [];
  if (!documents.some((d) => d.docType === "MEDIATION_CONTRACT" && d.status === "SIGNED")) {
    blockers.push("Contrato de mediação (vendedor ↔ plataforma) não assinado.");
  }
  if (!ctx.agreementOtpsComplete) blockers.push("OTP do acordo de negócio incompleto (comprador e/ou vendedor).");
  return blockers;
}

/**
 * Bloqueios para aceitar o DEPOSIT 30%: autorização de pagamento por terceiro
 * assinada + gate AML + mediação assinada.
 */
export function gateToDeposit(documents: DealDocumentRecord[], ctx: ThirdPartySignedContext): string[] {
  const blockers = gateToAgreed(documents, ctx);
  if (!documents.some((d) => d.docType === "COMMISSION_PAYMENT_AUTHORIZATION" && d.status === "SIGNED")) {
    blockers.push("Autorização do vendedor p/ pagamento da comissão por terceiro não assinada.");
  }
  blockers.push(...thirdPartyPayerGate({
    amlApproved: ctx.amlApproved,
    authorizationSigned: documents.some((d) => d.docType === "COMMISSION_PAYMENT_AUTHORIZATION" && d.status === "SIGNED"),
    buyerIdentified: ctx.buyerIdentified,
    sellerIdentified: ctx.sellerIdentified,
  }));
  return [...new Set(blockers)];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seq = 0;
function genId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function mustLoad(repo: DocumentRepository, documentId: string): Promise<DealDocumentRecord> {
  const doc = await repo.getDocument(documentId);
  if (!doc) throw new WorkflowError("NOT_FOUND", "Documento não encontrado.");
  return doc;
}

function assertStatus(doc: DealDocumentRecord, allowed: DealDocumentStatusName[], op: string): void {
  if (!allowed.includes(doc.status)) {
    throw new WorkflowError(
      "BAD_STATUS",
      `${op}: estado "${doc.status}" inválido (permitidos: ${allowed.join(", ")}).`
    );
  }
}