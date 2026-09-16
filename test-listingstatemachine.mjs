// Testes da máquina de estados do anúncio (spec v3 sec. 3).
// Correr: node --experimental-strip-types test-listingstatemachine.mjs

import {
  listingAllowedTransitions,
  listingCanTransition,
  canEditSensitiveField,
} from "./lib/listingStateMachine.ts";

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

// ---- Fluxo principal ----

check("fluxo: DRAFT→PENDING_VERIFICATION→VERIFIED→ACTIVE",
  listingAllowedTransitions("DRAFT")[0] === "PENDING_VERIFICATION"
  && listingAllowedTransitions("PENDING_VERIFICATION").includes("VERIFIED")
  && listingAllowedTransitions("VERIFIED").includes("ACTIVE"));

check("gate: publicar exige verificação + aprovação",
  listingCanTransition("PENDING_VERIFICATION", "VERIFIED", {}).missingGates.includes("docsVerified")
  && listingCanTransition("VERIFIED", "ACTIVE", { publishApproved: true }).ok
  && !listingCanTransition("VERIFIED", "ACTIVE", {}).ok);

check("gate: ressubmissão de rascunho exige o vendedor",
  listingCanTransition("DRAFT", "PENDING_VERIFICATION", {}).missingGates.includes("submittedBySeller")
  && listingCanTransition("DRAFT", "PENDING_VERIFICATION", { submittedBySeller: true }).ok);

check("exceção: bloqueado volta à verificação; recusado volta ao rascunho",
  listingAllowedTransitions("BLOCKED").includes("PENDING_VERIFICATION")
  && listingAllowedTransitions("REJECTED").join(",") === "DRAFT");

check("terminal: CLOSED sem saída", listingAllowedTransitions("CLOSED").length === 0);
check("expiração: ACTIVE→EXPIRED→ACTIVE ok", listingCanTransition("ACTIVE", "EXPIRED", {}).ok
  && listingCanTransition("EXPIRED", "ACTIVE", {}).ok);
check("salto: DRAFT→ACTIVE proibido",
  !listingCanTransition("DRAFT", "ACTIVE", {}).ok);

// ---- Edição de dados sensíveis (preço/IBAN) pós-publicação ----

check("sensível: rascunho pode editar sem exceção",
  canEditSensitiveField({ status: "DRAFT", verifiedDocs: false, exceptionApproved: false }).ok);
check("sensível: publicado bloqueia sem exceção",
  !canEditSensitiveField({ status: "ACTIVE", verifiedDocs: true, exceptionApproved: false }).ok);
check("sensível: publicado bloqueia mesmo verificado",
  !canEditSensitiveField({ status: "ACTIVE", verifiedDocs: true, exceptionApproved: false }).ok);
check("sensível: publicado aceita com exceção compliance",
  canEditSensitiveField({ status: "ACTIVE", verifiedDocs: true, exceptionApproved: true }).ok);
check("sensível: CLOSED nunca edita",
  !canEditSensitiveField({ status: "CLOSED", verifiedDocs: true, exceptionApproved: true }).ok);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);