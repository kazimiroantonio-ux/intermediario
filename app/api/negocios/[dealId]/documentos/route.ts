// Rotas documentais de um negócio (MVP sec. 10):
//   GET  /api/negocios/[dealId]/documentos  — listar documentos do negócio
//   POST /api/negocios/[dealId]/documentos  — gerar rascunho a partir do
//        estado real do negócio (nunca aceita vars do cliente — o servidor
//        constrói as variáveis da única fonte de dados).
// O fluxo de assinatura vive em [docId]/route.ts (PATCH lifecycle e
// POST consent/sign). Fase 4 (IA) virá por cima do mesmo motor.

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { createDraft, WorkflowError, type DraftInput, type TemplateRecord } from "@/lib/documentWorkflow";
import { dealToDocumentVars, type BusinessData, type DocumentTypeName, type RuleContext } from "@/lib/documentEngine";
import {
  computeAgreement,
  DEFAULT_SITE_RATE_BPS,
  DEFAULT_AGENT_SHARE_BPS,
  DEFAULT_VAT_BPS,
  COMMISSION_MIN_MINOR,
  DEFAULT_DEPOSIT_BPS,
} from "@/lib/commission";
import { documentDb } from "@/services/documentRepo";

// Tipos geráveis nesta fase (os restantes exigem passos de negócio prévios).
const CREATABLE: DocumentTypeName[] = ["MEDIATION_CONTRACT", "COMMISSION_PAYMENT_AUTHORIZATION"];

// Convenção: o `code` do DocumentTemplate na BD corresponde ao docType.
const CODE_BY_TYPE: Record<DocumentTypeName, string> = {
  MEDIATION_CONTRACT: "MEDIACAO_CONTRATO",
  COMMISSION_PAYMENT_AUTHORIZATION: "AUTORIZACAO_PAG_TERCEIRO",
  SELLER_REPRESENTATION_AUTHORIZATION: "REPRESENTACAO_VENDEDOR",
  DATA_CONSENT: "CONSENTIMENTO_DADOS",
  VISIT_AGREEMENT: "ACORDO_VISITA",
  INSPECTION_AUTHORIZATION: "AUTORIZACAO_INSPECAO",
  PURCHASE_PROPOSAL: "PROPOSTA_COMPRA",
  PROMISE_CONTRACT: "CONTRATO_PROMESSA",
  SALE_CONTRACT: "CONTRATO_COMPRA_VENDA",
  RECEIPT_90_DECLARATION: "DECLARACAO_RECIBO_90",
  HANDOVER_DOCUMENT: "DOCUMENTO_ENTREGA",
  KEYS_HANDOVER: "ENTREGA_CHAVES",
  CANCELLATION_DECLARATION: "DECLARACAO_CANCELAMENTO",
  REFUND_AGREEMENT: "ACORDO_DEVOLUCAO",
  TITLE_LEGITIMACY_DECLARATION: "DECLARACAO_TITULO",
  LIENS_DECLARATION: "DECLARACAO_ENCARGOS",
  BENEFICIAL_OWNER_FORM: "FORMULARIO_BENEFICIARIO",
  FUNDS_ORIGIN_DECLARATION: "DECLARACAO_ORIGEM_FUNDOS",
  INSPECTION_REPORT_DOC: "RELATORIO_INSPECAO",
};

function docTypeFromBody(body: { docType?: string } | null): DocumentTypeName | null {
  const v = String(body?.docType ?? "");
  return CREATABLE.includes(v as DocumentTypeName) ? (v as DocumentTypeName) : null;
}

export async function GET(request: Request, ctx: { params: Promise<{ dealId: string }> }) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });

  const dealId = (await ctx.params).dealId;
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { agent: { select: { userId: true } } },
  });
  if (!deal) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  const isAgent = deal.agent?.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isAgent && !isAdmin) {
    return NextResponse.json({ error: "Acesso restrito ao agente/admin do negócio." }, { status: 403 });
  }

  const docs = await prisma.dealDocument.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      docType: true,
      status: true,
      title: true,
      alerts: true,
      signedAt: true,
      requiresHumanReview: true,
      consentUrl: true,
      consentExpiresAt: true,
      createdAt: true,
      signatureRecords: { select: { signerRole: true, signedAt: true } },
    },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request, ctx: { params: Promise<{ dealId: string }> }) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });

  const rl = rateLimit(`docs:gerar:${clientIp(request)}`, 40, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const dealId = (await ctx.params).dealId;
  let body: { docType?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const docType = docTypeFromBody(body);
  if (!docType) {
    return NextResponse.json(
      { error: `Tipo não gerável nesta fase. Permitidos: ${CREATABLE.join(", ")}.` },
      { status: 400 }
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: dealInclude,
  });
  if (!deal) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  const isAgent = deal.agent?.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isAgent && !isAdmin) {
    return NextResponse.json({ error: "Acesso restrito ao agente/admin do negócio." }, { status: 403 });
  }

  try {
    const template = await loadTemplate(CODE_BY_TYPE[docType]);
    const { context, business } = buildFromDeal(deal);
    const draftInput: DraftInput = {
      template,
      vars: dealToDocumentVars(business),
      ruleContext: context,
      dealId,
      generatedById: session.user.id,
      title: docType === "MEDIATION_CONTRACT" ? "Contrato de Mediação Imobiliária" : "Autorização de Pagamento da Comissão por Terceiro",
    };

    const draft = createDraft(draftInput);
    const saved = await prisma.dealDocument.create({
      data: {
        dealId,
        templateId: template.code,
        revision: template.revision,
        docType: draft.docType,
        status: draft.status,
        title: draft.title,
        variables: draft.variables as unknown as Prisma.InputJsonValue,
        alerts: draft.alerts,
        bodyHash: draft.bodyHash,
        requiresHumanReview: draft.requiresHumanReview,
        signatureRequirement: draft.signatureRequirement,
        generatedById: session.user.id,
      },
    });
    await documentDb.createEvent({
      documentId: saved.id,
      type: "GENERATED",
      actorId: session.user.id,
      actorRole: session.user.role,
      ipAddress: clientIp(request),
      payload: { docType },
    });

    return NextResponse.json(
      {
        id: saved.id,
        status: saved.status,
        title: saved.title,
        alerts: saved.alerts,
        bodyHash: saved.bodyHash,
        requiresHumanReview: saved.requiresHumanReview,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers (fonte de dados única → variáveis + contexto de regras).
// ---------------------------------------------------------------------------

async function loadTemplate(code: string): Promise<TemplateRecord> {
  const tpl = await prisma.documentTemplate.findUnique({
    where: { code },
    include: { revisions: true },
  });
  if (!tpl) throw new WorkflowError("TEMPLATE_MISSING", `Template "${code}" não existe na BD.`);
  if (tpl.status !== "APPROVED") {
    throw new WorkflowError("TEMPLATE_NOT_APPROVED", `Template "${code}" não está aprovado para uso.`);
  }
  const rev =
    tpl.revisions.find((r) => r.version === tpl.currentRevision) ??
    tpl.revisions[tpl.revisions.length - 1];
  if (!rev) throw new WorkflowError("TEMPLATE_REV_MISSING", `Template "${code}" sem revisão publicada.`);

  const vars = Array.isArray(rev.varsSchema)
    ? (rev.varsSchema as Array<{ name: string }>).map((v) => v.name)
    : [];

  return {
    code: tpl.code,
    docType: tpl.docType as DocumentTypeName,
    revision: rev.version,
    content: rev.content,
    varsSchema: vars,
    signatureRequirement: tpl.signatureRequirement as TemplateRecord["signatureRequirement"],
    requiresHumanReview: tpl.requiresHumanReview,
    riskLevel: (tpl.riskLevel ?? 1) as 1 | 2 | 3,
  };
}

const dealInclude = { listing: true, seller: true, buyer: true, agent: true, agreement: true } satisfies Prisma.DealInclude;
type LoadedDeal = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

function buildFromDeal(deal: LoadedDeal): { context: RuleContext; business: BusinessData } {
  const ag = deal.agreement ?? null;
  const listing = deal.listing ?? null;

  const breakdown = ag
    ? {
        commissionNet: ag.commissionNet,
        commissionVat: ag.commissionVat,
        buyerPayable: ag.buyerPayable,
        sellerPayable: ag.sellerPayable,
      }
    : computeAgreement(
        deal.agreedPrice ?? deal.listedPrice,
        DEFAULT_SITE_RATE_BPS,
        DEFAULT_AGENT_SHARE_BPS,
        DEFAULT_VAT_BPS,
        COMMISSION_MIN_MINOR,
        DEFAULT_DEPOSIT_BPS
      );

  const agreedAmount = deal.agreedPrice ?? deal.listedPrice;
  const iban = ag?.sellerIban ?? listing?.sellerIban ?? "";

  const context: RuleContext = {
    sellerIdentified: Boolean(deal.seller?.name),
    sellerVerified: listing?.verificationStatus === "VERIFIED",
    buyerIdentified: Boolean(deal.buyer?.name),
    priceConfirmed: Boolean(ag?.buyerOtpAt && ag?.sellerOtpAt),
    commissionCalculated: Boolean(deal.agreedPrice || ag),
    ibanValidated: Boolean(ag?.sellerIbanVerifiedAt) || Boolean(listing?.sellerIbanVerifiedAt),
    thirdPartyPayerConfirmed: true, // modelo 30/70 é sempre pagador terceiro
    humanReviewDone: false,
    externalFormalizationDone: false,
  };

  const business: BusinessData = {
    sellerName: deal.seller?.name ?? "—",
    sellerNif: "",
    buyerName: deal.buyer?.name ?? "—",
    propertyDescription: `${listing?.title ?? "Imóvel"}${listing?.municipality ? ` — ${listing.municipality}` : ""}`,
    agreedPriceMinor: agreedAmount,
    commissionNetMinor: breakdown.commissionNet,
    buyerPayableMinor: breakdown.buyerPayable,
    sellerPayableMinor: breakdown.sellerPayable,
    iban,
    payerName: deal.buyer?.name ?? "—",
    paymentGrounds: "Delegação do pagamento da comissão no contrato de mediação (art. 4.º do modelo aprovado)",
    dateIso: new Date().toISOString().slice(0, 10),
  };

  return { context, business };
}