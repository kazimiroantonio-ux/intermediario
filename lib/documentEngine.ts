// ---------------------------------------------------------------------------
// Motor documental determinístico.
// A IA prepara e verifica (Fase 4 — a vir por cima desta biblioteca); as
// pessoas autorizadas aprovam; o sistema bloqueia quando faltam provas.
// O que importa aqui: modelos APROVADOS + placeholders AUTORIZADOS, render
// imutável, hash, motor de regras e gate do pagador terceiro (sec. 4/8).
// Não é aconselhamento jurídico.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

export type DocumentTypeName =
  | "MEDIATION_CONTRACT"
  | "COMMISSION_PAYMENT_AUTHORIZATION"
  | "SELLER_REPRESENTATION_AUTHORIZATION"
  | "DATA_CONSENT"
  | "VISIT_AGREEMENT"
  | "INSPECTION_AUTHORIZATION"
  | "PURCHASE_PROPOSAL"
  | "PROMISE_CONTRACT"
  | "SALE_CONTRACT"
  | "RECEIPT_90_DECLARATION"
  | "HANDOVER_DOCUMENT"
  | "KEYS_HANDOVER"
  | "CANCELLATION_DECLARATION"
  | "REFUND_AGREEMENT"
  | "TITLE_LEGITIMACY_DECLARATION"
  | "LIENS_DECLARATION"
  | "BENEFICIAL_OWNER_FORM"
  | "FUNDS_ORIGIN_DECLARATION"
  | "INSPECTION_REPORT_DOC";

export type SignatureRequirementName =
  | "DIGITAL_SUFFICIENT"
  | "QUALIFIED_REQUIRED"
  | "EXTERNAL_FORMALIZATION";

export type DocumentVars = Record<string, string | number | bigint | boolean>;

export class DocumentEngineError extends Error {
  readonly code: string;
  readonly details: string[];
  constructor(code: string, message: string, details: string[] = []) {
    super(message);
    this.name = "DocumentEngineError";
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Render de modelos: preenche SÓ {{campos}}, nunca inventa cláusulas.
// ---------------------------------------------------------------------------

export interface RenderResult {
  body: string;
  usedVars: string[];
  fileHash: string;
}

const PLACEHOLDER = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

/**
 * Substitui os placeholders {{campo}} autorizados vindos de `vars`. Campos em
 * falta → bloqueia (missing). Placeholder fora da `allowed` → bloqueia (unknown).
 * Devolve o corpo + hash sha256 do resultado (o hash é o que fica imutável após
 * assinatura — qualquer alteração posterior diverge do registo).
 */
export function renderTemplate(
  content: string,
  vars: DocumentVars,
  allowed: string[]
): RenderResult {
  const usedSet = new Set<string>();
  const missing: string[] = [];
  const unknown: string[] = [];

  let body = content.replace(PLACEHOLDER, (raw, name: string) => {
    if (!allowed.includes(name)) {
      unknown.push(name);
      return raw;
    }
    if (!(name in vars) || vars[name] === undefined || vars[name] === null || vars[name] === "") {
      missing.push(name);
      return raw;
    }
    usedSet.add(name);
    return String(vars[name]);
  });

  if (unknown.length > 0) {
    throw new DocumentEngineError(
      "UNKNOWN_VARS",
      "Placeholders não autorizados no modelo.",
      unknown.map((v) => `{{${v}}} não está em varsSchema`)
    );
  }
  if (missing.length > 0) {
    throw new DocumentEngineError(
      "MISSING_VARS",
      "Faltam campos obrigatórios para gerar o documento.",
      missing.map((v) => `Falta: ${v}`)
    );
  }

  return { body, usedVars: [...usedSet], fileHash: computeFileHash(body) };
}

export function computeFileHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

// ---------------------------------------------------------------------------
// Motor de regras (sec. 2): pré-condições por tipo de documento.
// ---------------------------------------------------------------------------

export interface DocumentRule {
  /** flags do contexto que têm de estar true */
  requires: string[];
  signatureRequirement: SignatureRequirementName;
  requiresHumanReview: boolean;
  riskLevel: 1 | 2 | 3;
}

export const RULES: Record<DocumentTypeName, DocumentRule> = {
  MEDIATION_CONTRACT: {
    requires: ["sellerIdentified", "sellerVerified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  COMMISSION_PAYMENT_AUTHORIZATION: {
    requires: ["sellerIdentified", "priceConfirmed", "commissionCalculated", "ibanValidated", "thirdPartyPayerConfirmed"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  SELLER_REPRESENTATION_AUTHORIZATION: {
    requires: ["sellerIdentified", "sellerVerified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  DATA_CONSENT: {
    requires: ["sellerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  VISIT_AGREEMENT: {
    requires: ["sellerIdentified", "buyerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  INSPECTION_AUTHORIZATION: {
    requires: ["sellerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  PURCHASE_PROPOSAL: {
    requires: ["buyerIdentified", "commissionCalculated"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  PROMISE_CONTRACT: {
    requires: ["sellerIdentified", "buyerIdentified", "priceConfirmed", "ibanValidated"],
    signatureRequirement: "QUALIFIED_REQUIRED",
    requiresHumanReview: true,
    riskLevel: 2,
  },
  SALE_CONTRACT: {
    requires: ["sellerIdentified", "sellerVerified", "buyerIdentified", "priceConfirmed", "externalFormalizationDone"],
    signatureRequirement: "EXTERNAL_FORMALIZATION",
    requiresHumanReview: true,
    riskLevel: 3,
  },
  RECEIPT_90_DECLARATION: {
    requires: ["priceConfirmed", "commissionCalculated", "sellerIdentified", "ibanValidated"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  HANDOVER_DOCUMENT: {
    requires: ["sellerIdentified", "buyerIdentified", "priceConfirmed"],
    signatureRequirement: "QUALIFIED_REQUIRED",
    requiresHumanReview: true,
    riskLevel: 2,
  },
  KEYS_HANDOVER: {
    requires: ["sellerIdentified", "buyerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  CANCELLATION_DECLARATION: {
    requires: ["sellerIdentified", "buyerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: true,
    riskLevel: 2,
  },
  REFUND_AGREEMENT: {
    requires: ["commissionCalculated", "humanReviewDone"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: true,
    riskLevel: 2,
  },
  TITLE_LEGITIMACY_DECLARATION: {
    requires: ["sellerIdentified", "sellerVerified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  LIENS_DECLARATION: {
    requires: ["sellerIdentified", "humanReviewDone"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: true,
    riskLevel: 2,
  },
  BENEFICIAL_OWNER_FORM: {
    requires: ["sellerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  FUNDS_ORIGIN_DECLARATION: {
    requires: ["buyerIdentified"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: false,
    riskLevel: 1,
  },
  INSPECTION_REPORT_DOC: {
    requires: ["humanReviewDone"],
    signatureRequirement: "DIGITAL_SUFFICIENT",
    requiresHumanReview: true,
    riskLevel: 2,
  },
};

export type RuleContext = Record<string, boolean>;

/** Pré-condições em falta → bloqueia a geração/envio até estarem cumpridas. */
export function checkRules(docType: DocumentTypeName, ctx: RuleContext): string[] {
  const rule = RULES[docType];
  if (!rule) return [`Sem regra definida para ${docType}`];
  return rule.requires.filter((flag) => ctx[flag] !== true);
}

// ---------------------------------------------------------------------------
// Gate do pagador terceiro (AML — Lei 5/20 + 8/26; sec. 4 e 8).
// O comprador paga dívida do vendedor → exceção controlada. Sem autorização
// assinada + análise de compliance, o DEPOSIT fica BLOQUEADO.
// ---------------------------------------------------------------------------

export interface ThirdPartyContext {
  amlApproved: boolean; // Agreement.amlReviewStatus == APPROVED
  authorizationSigned: boolean; // COMMISSION_PAYMENT_AUTHORIZATION com assinatura válida
  buyerIdentified: boolean;
  sellerIdentified: boolean;
}

export function thirdPartyPayerGate(ctx: ThirdPartyContext): string[] {
  const blockers: string[] = [];
  if (!ctx.sellerIdentified) blockers.push("Vendedor não identificado.");
  if (!ctx.buyerIdentified) blockers.push("Comprador não identificado.");
  if (!ctx.authorizationSigned) blockers.push("Sem autorização assinada do vendedor p/ pagamento da comissão por terceiro.");
  if (!ctx.amlApproved) blockers.push("Análise AML de pagador terceiro não aprovada (compliance).");
  return blockers;
}

// ---------------------------------------------------------------------------
// Dados únicos → variáveis do modelo ("introduzir uma vez, reutilizar e nunca
// divergir"). Todos os valores vêm da fonte calculada (computeAgreement).
// ---------------------------------------------------------------------------

export interface BusinessData {
  sellerName: string;
  sellerNif: string;
  buyerName: string;
  propertyDescription: string;
  agreedPriceMinor: bigint;
  commissionNetMinor: bigint;
  buyerPayableMinor: bigint;
  sellerPayableMinor: bigint;
  iban: string;
  payerName: string;
  paymentGrounds: string;
  dateIso: string;
}

export function dealToDocumentVars(b: BusinessData): DocumentVars {
  const kz = (minor: bigint) => formatKz(minor);
  return {
    nome_vendedor: b.sellerName,
    nif_vendedor: b.sellerNif,
    nome_comprador: b.buyerName,
    identificacao_imovel: b.propertyDescription,
    preco: kz(b.agreedPriceMinor),
    valor_comissao: kz(b.commissionNetMinor),
    valor_total_a_pagar_plataforma: kz(b.buyerPayableMinor),
    valor_a_receber_vendedor: kz(b.sellerPayableMinor),
    iban_vendedor: b.iban,
    nome_pagador: b.payerName,
    fundamento_pagamento: b.paymentGrounds,
    data: b.dateIso,
  };
}

/** "10000000.00" → "10.000.000,00 Kz". Determinístico (sem Intl/locale). */
export function formatKz(minor: bigint): string {
  const [intPart, decPart] = (Number(minor) / 100).toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${decPart} Kz`;
}