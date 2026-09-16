// Adaptador Prisma do `DocumentRepository` (lib/documentWorkflow).
// As rotas chamam o workflow PÚRO e este adapter persiste. Os campos do schema
// estão em camelCase e espelham 1:1 as interfaces do workflow; os Date ↔ ISO
// são convertidos à entrada/saída. Sem lógica de negócio aqui.
import type { DocumentRepository, DealDocumentRecord, SignatureRecord } from "@/lib/documentWorkflow";
import { prisma } from "@/lib/prisma";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function toDate(isoValue: string | null | undefined): Date | null | undefined {
  if (isoValue === undefined) return undefined;
  return isoValue ? new Date(isoValue) : null;
}

export const documentDb: DocumentRepository = {
  async getDocument(id) {
    const r = await prisma.dealDocument.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      dealId: r.dealId,
      templateId: r.templateId,
      revision: r.revision,
      docType: r.docType as DealDocumentRecord["docType"],
      status: r.status as DealDocumentRecord["status"],
      title: r.title,
      variables: r.variables as DealDocumentRecord["variables"],
      alerts: r.alerts,
      bodyHash: r.bodyHash,
      fileUrl: r.fileUrl,
      requiresHumanReview: r.requiresHumanReview,
      signatureRequirement: r.signatureRequirement as DealDocumentRecord["signatureRequirement"],
      generatedById: r.generatedById,
      reviewedById: r.reviewedById,
      reviewedAt: iso(r.reviewedAt),
      consentUrl: r.consentUrl,
      consentExpiresAt: iso(r.consentExpiresAt),
      signedAt: iso(r.signedAt),
      voidReason: r.voidReason,
      createdAtIso: r.createdAt ? r.createdAt.toISOString() : undefined,
    };
  },

  async updateDocument(id, patch) {
    await prisma.dealDocument.update({
      where: { id },
      data: {
        status: patch.status ?? undefined,
        bodyHash: patch.bodyHash ?? undefined,
        alerts: { set: patch.alerts ?? [] },
        reviewedById: patch.reviewedById !== undefined ? patch.reviewedById : undefined,
        reviewedAt: toDate(patch.reviewedAt),
        consentUrl: patch.consentUrl !== undefined ? patch.consentUrl : undefined,
        consentExpiresAt: toDate(patch.consentExpiresAt),
        signedAt: toDate(patch.signedAt),
        voidReason: patch.voidReason !== undefined ? patch.voidReason : undefined,
      } as never,
    });
  },

  async createSignature(sig: Omit<SignatureRecord, "id">): Promise<SignatureRecord> {
    const row = await prisma.documentSignature.create({
      data: {
        documentId: sig.documentId,
        signerId: sig.signerId ?? null,
        signerRole: sig.signerRole,
        method: sig.method as never,
        consentAt: toDate(sig.consentAt),
        otpVerifiedAt: toDate(sig.otpVerifiedAt),
        otpExpiresAt: toDate(sig.otpExpiresAt),
        ipAddress: sig.ipAddress ?? null,
        userAgent: sig.userAgent ?? null,
        deviceData: sig.deviceData ?? null,
        signedAt: toDate(sig.signedAt),
        certificateReference: sig.certificateReference ?? null,
        documentHash: sig.documentHash ?? "",
      },
    });
    return sigRecord(row);
  },

  async updateSignature(id, patch) {
    await prisma.documentSignature.update({
      where: { id },
      data: {
        signerId: patch.signerId !== undefined ? patch.signerId : undefined,
        consentAt: toDate(patch.consentAt),
        otpVerifiedAt: toDate(patch.otpVerifiedAt),
        otpExpiresAt: toDate(patch.otpExpiresAt),
        ipAddress: patch.ipAddress !== undefined ? patch.ipAddress : undefined,
        userAgent: patch.userAgent !== undefined ? patch.userAgent : undefined,
        deviceData: patch.deviceData !== undefined ? patch.deviceData : undefined,
        signedAt: toDate(patch.signedAt),
        certificateReference: patch.certificateReference !== undefined ? patch.certificateReference : undefined,
        documentHash: patch.documentHash !== undefined ? patch.documentHash : undefined,
      } as never,
    });
  },

  async getSignatures(documentId) {
    const rows = await prisma.documentSignature.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(sigRecord);
  },

  async createEvent(evt) {
    await prisma.documentEvent.create({
      data: {
        documentId: evt.documentId,
        type: evt.type,
        actorId: evt.actorId ?? null,
        actorRole: evt.actorRole ?? null,
        ipAddress: evt.ipAddress ?? null,
        payload: evt.payload ?? undefined,
      },
    });
  },
};

function sigRecord(r: {
  id: string;
  documentId: string;
  signerId: string | null;
  signerRole: string;
  method: string;
  consentAt: Date | null;
  otpVerifiedAt: Date | null;
  otpExpiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceData: string | null;
  signedAt: Date | null;
  certificateReference: string | null;
  documentHash: string;
}): SignatureRecord {
  return {
    id: r.id,
    documentId: r.documentId,
    signerId: r.signerId,
    signerRole: r.signerRole,
    method: r.method as SignatureRecord["method"],
    consentAt: iso(r.consentAt),
    otpVerifiedAt: iso(r.otpVerifiedAt),
    otpExpiresAt: iso(r.otpExpiresAt),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    deviceData: r.deviceData,
    signedAt: iso(r.signedAt),
    certificateReference: r.certificateReference,
    documentHash: r.documentHash,
  };
}