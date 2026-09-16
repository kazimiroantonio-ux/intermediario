// Testes da verificação do vendedor/imóvel (spec v3 — prioridade 4, selo
// "verificado"). Correr: node --experimental-strip-types test-verificationworkflow.mjs

import {
  startVerification,
  reviewCheck,
  requestMoreInfo,
  resubmitDocuments,
  approveCase,
  rejectCase,
  canPublishCase,
  checkVerificationDeadline,
  documentsDue,
  runAutoChecks,
  classifyRisk,
  normalizeName,
  nifDigits,
  nameMatches,
  isExpiredAt,
  REQUIRED_DOCS,
  VERIFICATION_DB_MAP,
} from "./lib/verificationWorkflow.ts";

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

const NOW = "2026-04-01T12:00:00.000Z";
const pedro = {
  fullName: "José Manuel dos Santos",
  nif: "541 720 983",
  province: "Luanda",
  isCompany: false,
};
const biPedro = { docId: "d1", type: "bi", sha256: "aaa111", holderName: "José Manuel dos Santos", nif: "541720983" };
const titlePedro = { docId: "d2", type: "title_deed", sha256: "bbb222", holderName: "José Manuel dos Santos" };
const procuraPedro = { docId: "d3", type: "procura", sha256: "ccc333", holderName: "José Manuel dos Santos" };

// ---- Helpers determinísticos ----
check("normalizeName: sem acentos/minúsculas/duplos espaços",
  normalizeName("José  Manuel dos SANTOS") === "jose manuel dos santos");
check("nifDigits: só dígitos",
  nifDigits("541 720 983") === "541720983");
check("nameMatches: ignorando acentos e caixa",
  nameMatches("José Manuel dos Santos", "JOSE MANUEL DOS SANTOS") === true);
check("nameMatches: divergente → falso",
  nameMatches("José Manuel dos Santos", "Maria Silva") === false);
check("isExpiredAt: expiração passada",
  isExpiredAt("2026-03-01T00:00:00.000Z", NOW) === true
  && isExpiredAt("2027-01-01T00:00:00.000Z", NOW) === false);

// ---- Submissão e auto-checks ----
const ok = startVerification({
  id: "v1",
  subjectType: "SELLER",
  subjectId: "u9",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, procuraPedro],
  nowIso: NOW,
});
check("docs completas → SUBMITTED e todos PASS",
  ok.ver?.status === "SUBMITTED" && ok.ver.checks.every((c) => c.status === "PASS"));
check("outbox: evento SUBMITTED emitido",
  ok.events?.some((e) => e.type === "SUBMITTED") === true);

const missing = startVerification({
  id: "v2",
  subjectType: "LISTING",
  subjectId: "l1",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro],
  nowIso: NOW,
});
check("procura em falta → NEEDS_MORE_INFO",
  missing.ver?.status === "NEEDS_MORE_INFO");
check("documentsDue lista o que falta",
  documentsDue("IMOVEL", [biPedro, titlePedro]).includes("procura"));

const expired = startVerification({
  id: "v3",
  subjectType: "LISTING",
  subjectId: "l2",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, { ...titlePedro, expiresAtIso: "2025-01-01T00:00:00.000Z" }, procuraPedro],
  nowIso: NOW,
});
check("documento expirado → check EXPIRED",
  expired.ver?.checks.find((c) => c.type === "title_deed")?.status === "EXPIRED");
check("expirado impede publicação (gate)",
  canPublishCase({ ...expired.ver, status: "VERIFIED" }, NOW).ok === false);

const incompat = startVerification({
  id: "v4",
  subjectType: "LISTING",
  subjectId: "l3",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [{ ...titlePedro, holderName: "Maria Silva" }, biPedro, procuraPedro],
  nowIso: NOW,
});
check("titular divergente → INCOMPATIBLE com explicação",
  incompat.ver?.checks.find((c) => c.type === "title_deed")?.status === "INCOMPATIBLE"
  && incompat.ver?.checks.find((c) => c.type === "title_deed")?.note?.includes("titular"));

const nifBad = startVerification({
  id: "v5",
  subjectType: "LISTING",
  subjectId: "l4",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, { ...procuraPedro, nif: "999999999" }],
  nowIso: NOW,
});
check("NIF divergente → INCOMPATIBLE",
  nifBad.ver?.checks.find((c) => c.type === "procura")?.status === "INCOMPATIBLE");

const dup = startVerification({
  id: "v6",
  subjectType: "LISTING",
  subjectId: "l5",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, { docId: "d3b", type: "procura", sha256: "ccc333" }, procuraPedro],
  nowIso: NOW,
});
check("duplicado com MESMO hash → válido",
  dup.ver?.checks.find((c) => c.type === "procura")?.status === "PASS");

const dupDiv = startVerification({
  id: "v7",
  subjectType: "LISTING",
  subjectId: "l6",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, { docId: "d3b", type: "procura", sha256: "DIFF" }, procuraPedro],
  nowIso: NOW,
});
check("duplicado com hash divergente → INCOMPATIBLE",
  dupDiv.ver?.checks.find((c) => c.type === "procura")?.status === "INCOMPATIBLE");

// ---- Risco ----
const riskHigh = classifyRisk({ ...pedro, thirdPartyPayer: true, pepHit: true, sanctionsHit: true });
check("risco alto (terceiro+PEP+sanções) → HIGH",
  riskHigh.level === "HIGH" && riskHigh.reasons.length === 3);
const riskNormal = classifyRisk(pedro);
check("sem indicadores → NORMAL",
  riskNormal.level === "NORMAL");
const company = classifyRisk({
  fullName: "Santos, Lda",
  isCompany: true,
  sharesBreakdown: [{ name: "A", pct: 50 }, { name: "B", pct: 50 }],
  sourceOfFundsDeclared: false,
});
check("sociedade multi-sócios + sem origem de fundos → HIGH",
  company.level === "HIGH");
const compSingle = classifyRisk({ fullName: "A, Lda", isCompany: true, sharesBreakdown: [{ name: "A", pct: 100 }], sourceOfFundsDeclared: true });
check("sociedade com fundos declarados e 1 titular → NORMAL",
  compSingle.level === "NORMAL");

// ---- Fluxo ----
const reviewed = reviewCheck(ok.ver, {
  checkId: "procura:check",
  reviewerId: "op-ver1",
  reviewerRole: "VERIFICADOR",
  result: "PASS",
  nowIso: NOW,
});
check("revisão humana → IN_REVIEW (ainda não aprovado)",
  reviewed.ver?.status === "IN_REVIEW");

check("AGENT não pode rever",
  reviewCheck(ok.ver, { checkId: "bi:check", reviewerId: "agente", reviewerRole: "AGENT", result: "PASS" }).error !== undefined);

const moreInfo = requestMoreInfo(ok.ver, { byId: "op-ver1", byRole: "VERIFICADOR", note: "Falta original da procuração.", nowIso: NOW });
check("pedir mais documentos → NEEDS_MORE_INFO",
  moreInfo.ver?.status === "NEEDS_MORE_INFO");

const resub = resubmitDocuments(ok.ver, {
  submittedBy: "u9",
  documents: [biPedro, titlePedro, procuraPedro],
  nowIso: NOW,
});
check("re-submissão volta a SUBMITTED",
  resub.ver?.status === "SUBMITTED");

const approved = approveCase(ok.ver, { approverId: "op-ver2", approverRole: "VERIFICADOR", nowIso: NOW });
check("aprovação normal (sem risco alto) → VERIFIED",
  approved.ver?.status === "VERIFIED");
check("gate após verificação → ok",
  canPublishCase(approved.ver, NOW).ok === true
  && approved.events?.some((e) => e.type === "APPROVED") === true);
check("aprovado não se altera mais",
  rejectCase(approved.ver, { byId: "op-ver1", byRole: "VERIFICADOR", reason: "x", nowIso: NOW }).error !== undefined);

check("aprovação com check pendente → bloqueada com motivo",
  approveCase(missing.ver, { approverId: "op-ver2", approverRole: "VERIFICADOR", nowIso: NOW }).error?.includes("Selos em falta") === true);

check("FINANCEIRO não aprova verificação",
  approveCase(ok.ver, { approverId: "op-fin1", approverRole: "FINANCEIRO", nowIso: NOW }).error !== undefined);

// ---- Risco alto: aprovação AML ----
const highRisk = startVerification({
  id: "v8",
  subjectType: "SELLER",
  subjectId: "u-hr",
  category: "IMOVEL",
  submittedBy: "u-hr",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, procuraPedro],
  risk: { thirdPartyPayer: true, pepHit: true },
  nowIso: NOW,
});
check("risco alto ainda não é aprovado nasce bloqueado p/ AML",
  approveCase(highRisk.ver, { approverId: "op-ver2", approverRole: "VERIFICADOR", nowIso: NOW, aml: null }).error?.includes("compliance") === true);
check("risco alto: AML pelo mesmo verificador → bloqueado",
  approvarAmlComVerificador(highRisk.ver)?.error !== undefined);
const amlOk = approveCase(reviewedAml(highRisk.ver), {
  approverId: "op-ver2",
  approverRole: "VERIFICADOR",
  nowIso: NOW,
  aml: { approvedById: "op-comp1", approverRole: "COMPLIANCE" },
});
check("risco alto: aprovação AML de compliance diferente → VERIFIED",
  amlOk.ver?.status === "VERIFIED" && amlOk.ver.amlApproved?.approverRole === "COMPLIANCE");
check("AML por VERIFICADOR → bloqueado (máquina de risco)",
  approveCase(reviewedAml(highRisk.ver), {
    approverId: "op-ver2",
    approverRole: "VERIFICADOR",
    nowIso: NOW,
    aml: { approvedById: "op-ver5", approverRole: "VERIFICADOR" },
  }).error !== undefined);

function reviewedAml(ver) {
  return reviewCheck(ver, { checkId: "bi:check", reviewerId: "op-ver1", reviewerRole: "VERIFICADOR", result: "PASS", nowIso: NOW }).ver;
}
function approvarAmlComVerificador(ver) {
  const r = reviewedAml(ver);
  return approveCase(r, { approverId: "op-ver2", approverRole: "VERIFICADOR", nowIso: NOW, aml: { approvedById: "op-ver1", approverRole: "COMPLIANCE" } });
}

// ---- Rejeição ----
const rej = rejectCase(missing.ver, { byId: "op-ver1", byRole: "VERIFICADOR", reason: "Título com ónus não declarado.", nowIso: NOW });
check("rejeição → REJECTED com motivo e evento",
  rej.ver?.status === "REJECTED" && rej.ver?.rejectedReason?.includes("ónus")
  && rej.events?.some((e) => e.type === "REJECTED") === true);
check("rejeição sem motivo → erro",
  rejectCase(missing.ver, { byId: "op-ver1", byRole: "VERIFICADOR", reason: " ", nowIso: NOW }).error !== undefined);
check("rejeitada não publica",
  canPublishCase(rej.ver, NOW).ok === false);

// ---- Fila/escalamento ----
check("dentro do prazo → sem escalamento",
  checkVerificationDeadline(missing.ver, NOW).escalated === false);
const late = startVerification({
  id: "v9",
  subjectType: "LISTING",
  subjectId: "l9",
  category: "IMOVEL",
  submittedBy: "u9",
  actorRole: "SELLER",
  subjectData: pedro,
  documents: [biPedro, titlePedro, procuraPedro],
  nowIso: "2026-01-01T00:00:00.000Z",
  deadlineDays: 2,
});
const esc = checkVerificationDeadline(late.ver, "2026-01-05T00:00:00.000Z");
check("prazo ultrapassado → escalado com próximo passo",
  esc.escalated === true && esc.nextStep !== undefined);
check("verificada nunca escala",
  checkVerificationDeadline(approved.ver, "2030-01-01T00:00:00.000Z").escalated === false);

// ---- Mapa BD e lista de docs ----
check("REQUIRED_DOCS: IMOVEL exige procura/título/BI",
  REQUIRED_DOCS.IMOVEL.length === 3 && REQUIRED_DOCS.IMOVEL.includes("title_deed"));
check("mapa BD: SUBMITTED→PENDING_DOCS e VERIFIED→VERIFIED",
  VERIFICATION_DB_MAP.SUBMITTED === "PENDING_DOCS" && VERIFICATION_DB_MAP.VERIFIED === "VERIFIED");

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);