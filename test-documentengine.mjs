// Testes do motor documental determinístico (plataforma documental, sec. 5/6).
// Correr: node --experimental-strip-types test-documentengine.mjs

import {
  renderTemplate,
  computeFileHash,
  checkRules,
  thirdPartyPayerGate,
  dealToDocumentVars,
  RULES,
  DocumentEngineError,
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

function expectCode(fn, code) {
  try {
    fn();
  } catch (e) {
    return e instanceof DocumentEngineError && e.code === code;
  }
  return false;
}

// ---- Render de modelos ----

const MODEL = [
  "Vendedor: {{nome_vendedor}}",
  "Comissão: {{valor_comissao}}",
  "Totais fixos: o pagamento não prova a compra e venda.",
].join("\n");
const ALLOWED = ["nome_vendedor", "valor_comissao"];

const r = renderTemplate(MODEL, { nome_vendedor: "Maria Santos", valor_comissao: "11.400.000,00 Kz" }, ALLOWED);
check("render: preenche os placeholders autorizados", r.body.includes("Vendedor: Maria Santos") && r.body.includes("Comissão: 11.400.000,00 Kz"));
check("render: cláusulas fixas intocadas", r.body.includes("o pagamento não prova a compra e venda"));
check("render: usedVars sem duplicados", r.usedVars.length === 2 && new Set(r.usedVars).size === 2);
check("render: hash computado", r.fileHash.length === 64);

check("render: falta de campo bloqueia (MISSING_VARS)", expectCode(
  () => renderTemplate(MODEL, { nome_vendedor: "Maria Santos" }, ALLOWED), "MISSING_VARS"));
check("render: placeholder não autorizado bloqueia (UNKNOWN_VARS)", expectCode(
  () => renderTemplate("{{iban_vendedor}}", { iban_vendedor: "AO06..." }, ["nome_vendedor"]), "UNKNOWN_VARS"));
check("render: placeholder repetido usa o mesmo valor", renderTemplate(
  "{{nome_vendedor}} e {{nome_vendedor}}", { nome_vendedor: "X" }, ["nome_vendedor"]).body === "X e X");

const fixed = "Cláusula A. Cláusula B.";
check("hash: token fixo mantém-se", renderTemplate(fixed, {}, []).body === fixed);
check("hash: estável para o mesmo corpo", computeFileHash(fixed) === computeFileHash(fixed));
check("hash: muda com qualquer alteração", computeFileHash(fixed) !== computeFileHash(`${fixed} `));

// ---- Motor de regras ----

const baseCtx = {
  sellerIdentified: true,
  sellerVerified: true,
  buyerIdentified: true,
  priceConfirmed: true,
  commissionCalculated: true,
  ibanValidated: true,
  thirdPartyPayerConfirmed: true,
  humanReviewDone: true,
  externalFormalizationDone: true,
};

check("regras: MEDIATION ok com vendedor identificado+verificado",
  checkRules("MEDIATION_CONTRACT", baseCtx).length === 0);
check("regras: MEDIATION bloqueia sem verificação", checkRules("MEDIATION_CONTRACT", { ...baseCtx, sellerVerified: false })[0].includes("sellerVerified"));
check("regras: SALE exige formalização externa e bloqueia sem ela",
  checkRules("SALE_CONTRACT", { ...baseCtx, externalFormalizationDone: false }).length === 1);
check("regras: SALE é formalização externa", RULES.SALE_CONTRACT.signatureRequirement === "EXTERNAL_FORMALIZATION");
check("regras: PROMISE exige assinatura qualificada", RULES.PROMISE_CONTRACT.signatureRequirement === "QUALIFIED_REQUIRED");
check("regras: MEDIATION é assinatura digital simples", RULES.MEDIATION_CONTRACT.signatureRequirement === "DIGITAL_SUFFICIENT");

check("regras: COMMISSION_PAYMENT_AUTHORIZATION exige terceiro+iban",
  checkRules("COMMISSION_PAYMENT_AUTHORIZATION", { ...baseCtx, priceConfirmed: false }).length === 1);

// ---- Gate ambulatório pagador terceiro ----

check("gate: bloqueia sem autorização assinada → não cobra 30%",
  thirdPartyPayerGate({ amlApproved: true, authorizationSigned: false, buyerIdentified: true, sellerIdentified: true })[0].includes("autorização assinada"));
check("gate: bloqueia sem aprovação AML",
  thirdPartyPayerGate({ amlApproved: false, authorizationSigned: true, buyerIdentified: true, sellerIdentified: true })[0].includes("AML"));
check("gate: bloqueia sem comprador identificado",
  thirdPartyPayerGate({ amlApproved: true, authorizationSigned: true, buyerIdentified: false, sellerIdentified: true })[0].includes("Comprador"));
check("gate: liberta com tudo cumprido",
  thirdPartyPayerGate({ amlApproved: true, authorizationSigned: true, buyerIdentified: true, sellerIdentified: true }).length === 0);

// ---- Dados únicos → variáveis (fonte da verdade = computeAgreement) ----

const vars = dealToDocumentVars({
  sellerName: "Maria Santos",
  sellerNif: "5001234567",
  buyerName: "João André",
  propertyDescription: "T3 no Kilamba, Apt 12",
  agreedPriceMinor: 1_000_000_000n, // 10.000.000 Kz
  commissionNetMinor: 100_000_000n, // 1.000.000 Kz
  buyerPayableMinor: 114_000_000n, // 1.140.000 Kz
  sellerPayableMinor: 900_000_000n, // 9.000.000 Kz
  iban: "AO06 0040 0000 0000 1234",
  payerName: "João André",
  paymentGrounds: "Delegação de pagamento da comissão (art. contrato de mediação)",
  dateIso: "2026-09-10",
});
check("vars: nome do vendedor", vars.nome_vendedor === "Maria Santos");
check("vars: NIF do vendedor", vars.nif_vendedor === "5001234567");
check("vars: preço formatado em Kz", vars.preco === "10.000.000,00 Kz");
check("vars: comissão formatada", vars.valor_comissao === "1.000.000,00 Kz");
check("vars: montante da plataforma (net+IVA)", vars.valor_total_a_pagar_plataforma === "1.140.000,00 Kz");
check("vars: 90% do vendedor", vars.valor_a_receber_vendedor === "9.000.000,00 Kz");
check("vars: IBAN", vars.iban_vendedor === "AO06 0040 0000 0000 1234");
check("vars: pagador", vars.nome_pagador === "João André");
check("vars: fundamento", vars.fundamento_pagamento.includes("Delegação de pagamento"));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);