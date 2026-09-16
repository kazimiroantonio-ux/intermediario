// Lifecycle de um documento do negócio (MVP sec. 10, fase 1: candidatura):
//   PATCH /api/negocios/[dealId]/documentos/[docId]  { action }
//     REQUEST_REVIEW | APPROVE_REVIEW | SEND | READ | REJECT
//   POST  /api/negocios/[dealId]/documentos/[docId]  { action }
//     CONSENT { signerRole }                     → gera OTP (Verification)
//     SIGN    { signerRole, otp, ... }           → valida OTP + assina
// O OTP é guardado em `Verification` (expira 15 min); o código NUNCA é
// devolvido pela API (o SMS/WhatsApp é canal externo).

import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import {
  approveReview,
  completeSignature,
  confirmRead,
  issueConsent,
  rejectDocument,
  requestReview,
  sendForSignature,
  WorkflowError,
} from "@/lib/documentWorkflow";
import { documentDb } from "@/services/documentRepo";

const OTP_TTL_MS = 15 * 60 * 1000;
const SIGNER_ROLES = ["SELLER", "BUYER", "AGENT", "COMPLIANCE"];

function otpIdentifier(docId: string, signerRole: string): string {
  return `DOCSIGN:${docId}:${signerRole}`;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ dealId: string; docId: string }> }) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });

  const { docId } = await ctx.params;
  let body: { action?: string; reason?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const action = String(body?.action ?? "");

  try {
    switch (action) {
      case "REQUEST_REVIEW": {
        if (session.user.role !== "AGENT" && session.user.role !== "ADMIN") {
          return NextResponse.json({ error: "Só o agente/admin pede revisão." }, { status: 403 });
        }
        await requestReview(documentDb, docId, session.user.id);
        break;
      }
      case "APPROVE_REVIEW": {
        if (session.user.role !== "ADMIN") {
          return NextResponse.json({ error: "Revisão reservada a compliance (admin)." }, { status: 403 });
        }
        await approveReview(documentDb, docId, session.user.id, session.user.role);
        break;
      }
      case "SEND": {
        if (session.user.role !== "AGENT" && session.user.role !== "ADMIN") {
          return NextResponse.json({ error: "Só o agente/admin envia para assinatura." }, { status: 403 });
        }
        const url = `${request.headers.get("origin") ?? ""}/docs/${docId}`;
        await sendForSignature(documentDb, docId, session.user.id, { consentUrl: url });
        break;
      }
      case "READ": {
        await confirmRead(documentDb, docId, session.user.id);
        break;
      }
      case "REJECT": {
        if (session.user.role !== "ADMIN") {
          return NextResponse.json({ error: "Rejeição reservada a compliance (admin)." }, { status: 403 });
        }
        const reason = String(body?.reason ?? "").trim();
        if (!reason) return NextResponse.json({ error: "Motivo obrigatório." }, { status: 400 });
        await rejectDocument(documentDb, docId, session.user.id, reason);
        break;
      }
      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }

  const doc = await documentDb.getDocument(docId);
  return NextResponse.json({ id: docId, status: doc?.status ?? null });
}

export async function POST(request: Request, ctx: { params: Promise<{ dealId: string; docId: string }> }) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });

  const rl = rateLimit(`docs:sign:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { docId } = await ctx.params;
  let body: {
    action?: string;
    signerRole?: string;
    otp?: string;
    userAgent?: string;
    deviceData?: string;
  } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const action = String(body?.action ?? "");
  const signerRole = String(body?.signerRole ?? "");
  if (!SIGNER_ROLES.includes(signerRole)) {
    return NextResponse.json({ error: "Função de signatário inválida." }, { status: 400 });
  }

  try {
    if (action === "CONSENT") {
      // CONSENT pode ser do próprio (parte no negócio) ou do agente (p/ AGENT).
      const doc = await documentDb.getDocument(docId);
      if (!doc) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

      const sig = await issueConsent(documentDb, docId, {
        signerId: session.user.id,
        signerRole,
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      });

      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const identifier = otpIdentifier(docId, signerRole);
      await prisma.verification.deleteMany({ where: { identifier } });
      await prisma.verification.create({
        data: { identifier, value: code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
      });

      // TODO(fase 2): enviar `code` por SMS/WhatsApp/email ao signatário.
      // O código nunca é devolvido nesta resposta.
      return NextResponse.json({
        consentId: sig.id,
        otpExpiresAt: sig.otpExpiresAt,
        hint: "OTP gerado e enviado por canal externo.",
      });
    }

    if (action === "SIGN") {
      const code = String(body?.otp ?? "");
      const verification = await prisma.verification.findFirst({
        where: { identifier: otpIdentifier(docId, signerRole) },
      });
      const valid = Boolean(verification && verification.value === code && verification.expiresAt.getTime() > Date.now());

      await completeSignature(documentDb, docId, {
        signerId: session.user.id,
        signerRole,
        otpVerified: valid,
        ipAddress: clientIp(request),
        userAgent: body?.userAgent ?? request.headers.get("user-agent") ?? undefined,
        deviceData: body?.deviceData,
      });

      if (valid) {
        await prisma.verification.deleteMany({ where: { identifier: otpIdentifier(docId, signerRole) } });
      }
      return NextResponse.json({ signed: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}