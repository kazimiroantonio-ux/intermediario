// Testes de autorização (spec v3 sec. 4 — OWASP ASVS 4.1, BOLA/BFLA).
// Correr: node --experimental-strip-types test-accesspolicy.mjs

import { can, validateFourEyes, PERMISSION_MATRIX } from "./lib/accessPolicy.ts";

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

// ---- Matriz por função (spec v3 sec. 4) ----

check("FINANCEIRO: reconcilia pagamentos",
  can({ operatorRole: "FINANCEIRO" }, "payments", "reconcile").allowed);
check("FINANCEIRO: NÃO aprova documentos jurídicos",
  !can({ operatorRole: "FINANCEIRO" }, "documents", "approve").allowed);
check("FINANCEIRO: NÃO aprova AML",
  !can({ operatorRole: "FINANCEIRO" }, "aml", "approve").allowed);

check("COMPLIANCE: aprova AML",
  can({ operatorRole: "COMPLIANCE" }, "aml", "approve").allowed);
check("COMPLIANCE: NÃO reconcilia pagamentos",
  !can({ operatorRole: "COMPLIANCE" }, "payments", "reconcile").allowed);
check("COMPLIANCE: bloqueia listings",
  can({ operatorRole: "COMPLIANCE" }, "listings", "block").allowed);

check("VERIFICADOR: verifica listings/vendedor",
  can({ operatorRole: "VERIFICADOR" }, "listings", "verify").allowed
  && can({ operatorRole: "VERIFICADOR" }, "sellers", "verify").allowed);
check("VERIFICADOR: NÃO toca em reembolsos",
  !can({ operatorRole: "VERIFICADOR" }, "refunds", "create").allowed
  && !can({ operatorRole: "VERIFICADOR" }, "refunds", "approve").allowed);

check("SUPERVISOR: aprova reembolsos",
  can({ operatorRole: "SUPERVISOR" }, "refunds", "approve").allowed);
check("SUPERVISOR: NÃO configura sistema",
  !can({ operatorRole: "SUPERVISOR" }, "config", "manage").allowed);

check("ADMIN_TECNICO: não vê documentos sem justificação",
  !can({ operatorRole: "ADMIN_TECNICO" }, "documents", "view").allowed);
check("ADMIN_TECNICO: gere configuração/utilizadores",
  can({ operatorRole: "ADMIN_TECNICO" }, "config", "manage").allowed);
check("ADMIN_PRINCIPAL: acesso global amplo",
  can({ operatorRole: "ADMIN_PRINCIPAL" }, "documents", "approve").allowed
  && can({ operatorRole: "ADMIN_PRINCIPAL" }, "payments", "reconcile").allowed);

check("AGENT: gere deals, não liberta fundos",
  can({ operatorRole: "AGENT" }, "deals", "create").allowed
  && !can({ operatorRole: "AGENT" }, "payments", "reconcile").allowed
  && !can({ operatorRole: "AGENT" }, "refunds", "approve").allowed
  && !can({ operatorRole: "AGENT" }, "aml", "approve").allowed);

check("sem função: bloqueado",
  !can({ operatorRole: null }, "docs", "view").allowed);
check("cada função tem pelo menos 1 permissão", Object.values(PERMISSION_MATRIX).every((v) => v.length > 0));

// ---- Four-eyes / separação de funções ----

check("four-eyes: requerente não aprova o próprio pedido",
  !validateFourEyes({
    requestedById: "u1", requesterRole: "FINANCEIRO",
    approvedById: "u1", approverRole: "FINANCEIRO",
    permission: "refunds.approve",
  }).ok);

check("four-eyes: refunds.approve exige funções DIFERENTES",
  !validateFourEyes({
    requestedById: "u1", requesterRole: "FINANCEIRO",
    approvedById: "u2", approverRole: "FINANCEIRO",
    permission: "refunds.approve",
  }).ok);

check("four-eyes: FINANCEIRO + SUPERVISOR ok",
  validateFourEyes({
    requestedById: "u1", requesterRole: "FINANCEIRO",
    approvedById: "u3", approverRole: "SUPERVISOR",
    permission: "refunds.approve",
  }).ok);

check("four-eyes: ação normal admite mesma função",
  validateFourEyes({
    requestedById: "u1", requesterRole: "COMPLIANCE",
    approvedById: "u2", approverRole: "COMPLIANCE",
    permission: "documents.reject",
  }).ok);

check("four-eyes: aml.approve exige funções diferentes",
  !validateFourEyes({
    requestedById: "u1", requesterRole: "COMPLIANCE",
    approvedById: "u2", approverRole: "COMPLIANCE",
    permission: "aml.approve",
  }).ok);

check("four-eyes: deals.override exige funções diferentes",
  !validateFourEyes({
    requestedById: "u1", requesterRole: "AGENT",
    approvedById: "u2", approverRole: "AGENT",
    permission: "deals.override",
  }).ok);

check("four-eyes: sem aprovador bloqueia",
  !validateFourEyes({
    requestedById: "u1", requesterRole: "FINANCEIRO",
    approvedById: null, approverRole: null,
    permission: "refunds.approve",
  }).ok);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);