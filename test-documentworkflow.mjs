// Testes do workflow documental (ports & adapters — sem BD).
// Correr: node --experimental-strip-types test-documentworkflow.mjs

import {
  createDraft,
  requestReview,
  approveReview,
  sendForSignature,
  confirmRead,
  issueConsent,
  completeSignature,
  rejectDocument,
  gateToAgreed,
  gateToDeposit,
  WorkflowError,
} from "./lib/documentWorkflow.ts";
import {
  RULES,
} from "./lib/documentEngine.ts";

let pass = 0;
let fail = 0;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${label}`);
  } else {
    fail++;
    console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectError(fn, code) {
  try {
    await fn();
  } catch (e) {
    return e instanceof WorkflowError && e.code === code;
  }
  return false;
}

// ---- Repositório fake ----

class FakeRepo {
  constructor() {
    this.docs = new Map();
    this.sigs = new Map();
    this.events = [];
    this.seq = 0;
  }
  async getDocument(id) {
    const d = this.docs.get(id);
    return d ? { ...d } : null;
  }
  async updateDocument(id, patch) {
    const d = this.docs.get(id);
    if (d) this.docs.set(id, { ...d, ...patch });
  }
  async createSignature(sig) {
    const id = `S${++this.seq}`;
    const rec = { id, ...sig };
    if (!this.sigs.has(sig.documentId)) this.sigs.set(sig.documentId, []);
    this.sigs.get(sig.documentId).push(rec);
    return { ...rec };
  }
  async updateSignature(id, patch) {
    for (const [, arr] of this.sigs) {
      const i = arr.findIndex((s) => s.id === id);
      if (i >= 0) arr[i] = { ...arr[i], ...patch };
    }
  }
  async getSignatures(documentId) {
    return (this.sigs.get(documentId) ?? []).map((s) => ({ ...s }));
  }
  async createEvent(evt) {
    this.events.push(evt);
  }
}

const MEDIATION_TEMPLATE = {
  code: "MEDIACAO",
  docType: "MEDIATION_CONTRACT",
  revision: 3,
  content: [
    "Contrato de Mediação — Intermediário",
    "Vendedor: {{nome_vendedor}} (NIF {{nif_vendedor}})",
    "Imóvel: {{identificacao_imovel}}",
    "Preço: {{preco}} — Comissão: {{valor_comissao}}",
    "O pagamento da comissão pelo comprador não prova a compra e venda.",
  ].join("\n"),
  varsSchema: ["nome_vendedor", "nif_vendedor", "identificacao_imovel", "preco", "valor_comissao"],
  signatureRequirement: "DIGITAL_SUFFICIENT",
  requiresHumanReview: false,
  riskLevel: 1,
};

const ctx = {
  sellerIdentified: true,
  sellerVerified: true,
  buyerIdentified: true,
  priceConfirmed: true,
  commissionCalculated: true,
  ibanValidated: true,
  thirdPartyPayerConfirmed: true,
  humanReviewDone: true,
  externalFormalizationDone: false,
};

const vars = {
  nome_vendedor: "Maria Santos",
  nif_vendedor: "5001234567",
  identificacao_imovel: "T3 no Kilamba, Apt 12",
  preco: "10.000.000,00 Kz",
  valor_comissao: "1.000.000,00 Kz",
};

// ---- 1. Rascunho ----

const draft = createDraft({ template: MEDIATION_TEMPLATE, vars, ruleContext: ctx, dealId: "D1" });
check("rascunho: status DRAFT", draft.status === "DRAFT");
check("rascunho: sem alertas com contexto ok", draft.alerts.length === 0);
check("rascunho: hash de 64 hex", draft.bodyHash !== null && draft.bodyHash.length === 64);

const blockedDraft = createDraft({
  template: MEDIATION_TEMPLATE,
  vars: { ...vars, identificacao_imovel: "" },
  ruleContext: ctx,
  dealId: "D1",
});
check("rascunho: campo vazio → alerta de rendering (bloqueio, não crash)",
  blockedDraft.alerts.some((a) => a.includes("identificacao_imovel")));

// ---- 2. Revisão → envio ----

{
  const repo = new FakeRepo();
  repo.docs.set(draft.id, { ...draft, alerts: [] });

  check("envio antes de aprovar bloqueia (BAD_STATUS)", await expectError(
    () => sendForSignature(repo, draft.id, "U1"), "BAD_STATUS"));

  await requestReview(repo, draft.id, "U1");
  check("requestReview → PENDING_REVIEW", (await repo.getDocument(draft.id)).status === "PENDING_REVIEW");

  await approveReview(repo, draft.id, "U2", "COMPLIANCE");
  const approved = await repo.getDocument(draft.id);
  check("approveReview → APPROVED com reviewer", approved.status === "APPROVED" && approved.reviewedById === "U2");

  await sendForSignature(repo, draft.id, "U1", { consentUrl: "https://link.invalid/abc" });
  const sent = await repo.getDocument(draft.id);
  check("envio → SENT com link e expiração", sent.status === "SENT" && sent.consentUrl.length > 0 && sent.consentExpiresAt != null);

  await confirmRead(repo, draft.id, "BUYER");
  check("confirmação de leitura → READ", (await repo.getDocument(draft.id)).status === "READ");
}

// ---- 3. Consentimento + assinatura ----

{
  const repo = new FakeRepo();
  const d = createDraft({ template: MEDIATION_TEMPLATE, vars, ruleContext: ctx, dealId: "D1" });
  repo.docs.set(d.id, { ...d });
  await requestReview(repo, d.id, "U1");
  await approveReview(repo, d.id, "U2", "COMPLIANCE");
  await sendForSignature(repo, d.id, "U1");
  await confirmRead(repo, d.id, "SELLER");

  check("assinatura sem consentimento → NO_CONSENT", await expectError(
    () => completeSignature(repo, d.id, { signerRole: "SELLER", otpVerified: true }), "NO_CONSENT"));

  const consent = await issueConsent(repo, d.id, { signerRole: "SELLER" });
  check("consentimento gerado com OTP expiry", consent.consentAt != null && consent.otpExpiresAt != null);

  check("OTP não verificado bloqueia", await expectError(
    () => completeSignature(repo, d.id, { signerRole: "SELLER", otpVerified: false }), "OTP_UNVERIFIED"));

  await completeSignature(repo, d.id, { signerRole: "SELLER", otpVerified: true, ipAddress: "10.0.0.1", userAgent: "test" });
  const signed = await repo.getDocument(d.id);
  check("ASSINADO: status SIGNED + data", signed.status === "SIGNED" && signed.signedAt != null);
  const sigs = await repo.getSignatures(d.id);
  check("ASSINADO: registo tem hash do documento + IP",
    sigs[0].documentHash === d.bodyHash && sigs[0].ipAddress === "10.0.0.1");
  check("ASSINADO: evento SIGNED registado", repo.events.some((e) => e.type === "SIGNED"));

  check("dupla assinatura → ALREADY_SIGNED", await expectError(
    () => completeSignature(repo, d.id, { signerRole: "SELLER", otpVerified: true }), "ALREADY_SIGNED"));
}

// OTP expirado
{
  const repo = new FakeRepo();
  const d = createDraft({ template: MEDIATION_TEMPLATE, vars, ruleContext: ctx, dealId: "D1" });
  repo.docs.set(d.id, { ...d });
  await requestReview(repo, d.id, "U1");
  await approveReview(repo, d.id, "U2", "COMPLIANCE");
  await sendForSignature(repo, d.id, "U1");
  await issueConsent(repo, d.id, { signerRole: "BUYER", otpExpiresAt: new Date(Date.now() - 1000).toISOString() });
  check("OTP expirado bloqueia (OTP_EXPIRED)", await expectError(
    () => completeSignature(repo, d.id, { signerRole: "BUYER", otpVerified: true }), "OTP_EXPIRED"));
}

// ---- 4. Gates do negócio ----

{
  const mediationSigned = [
    { docType: "MEDIATION_CONTRACT", status: "SIGNED" },
    { docType: "COMMISSION_PAYMENT_AUTHORIZATION", status: "SIGNED" },
  ];
  const nothingSigned = [];

  const ctxOk = { amlApproved: true, buyerIdentified: true, sellerIdentified: true, agreementOtpsComplete: true };
  check("gate AGREED: bloqueia sem mediação assinada", gateToAgreed(nothingSigned, ctxOk).length === 1);
  check("gate AGREED: liberta com mediação + OTPs", gateToAgreed(mediationSigned, ctxOk).length === 0);
  check("gate AGREED: bloqueia sem OTPs", gateToAgreed(mediationSigned, { ...ctxOk, agreementOtpsComplete: false }).length === 1);

  check("gate DEPOSIT: bloqueia sem autorização de terceiro", gateToDeposit([mediationSigned[0]], ctxOk).length >= 1);
  check("gate DEPOSIT: liberta com autorização + AML", gateToDeposit(mediationSigned, ctxOk).length === 0);
  check("gate DEPOSIT: bloqueia sem aprovação AML", gateToDeposit(mediationSigned, { ...ctxOk, amlApproved: false }).length >= 1);
}

// ---- 5. Recusa ----

{
  const repo = new FakeRepo();
  const d = createDraft({ template: MEDIATION_TEMPLATE, vars, ruleContext: ctx, dealId: "D1" });
  repo.docs.set(d.id, { ...d });
  await rejectDocument(repo, d.id, "U9", "Divergência no título");
  check("recusa → REJECTED com motivo e evento", (await repo.getDocument(d.id)).status === "REJECTED"
    && repo.events.some((e) => e.type === "REJECTED"));
}

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);