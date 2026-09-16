// Testes da IA — guarda-redes determinística (spec v3 — prioridade 10, Fase 5).
// Correr: node --experimental-strip-types test-aiassist.mjs

import {
  sanitizeAdText,
  assessContractClause,
  assessAmountAgainstCommission,
  logAiAction,
  approveAiAction,
  rejectAiAction,
  applyChanges,
  hashInput,
  hashPrompt,
} from "./lib/aiAssist.ts";

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

// (a) Sanitização do anúncio
const s1 = sanitizeAdText("Vendo BMW X5, entre em contacto 924 111 222 ou email@x.com, ver www.site.ao");
check("contacto/email/site bloqueados e removidos",
  s1.blocked.length === 3 && !/924|email@x\.com|site\.ao/.test(s1.cleaned));
const s2 = sanitizeAdText("25% de sinal, IBAN AO0600000000000000000000");
check("IBAN bloqueado",
  s2.blocked.includes("Dados bancários no anúncio."));
const s3 = sanitizeAdText("Carro importado 2019, arranja-se documentação.");
check("texto limpo passa sem bloqueios",
  s3.blocked.length === 0 && s3.cleaned === "Carro importado 2019, arranja-se documentação.");

// (b) Cláusulas de contrato
const TEMPLATES = ["Comissões conforme 30/70.", "Obrigações das partes vêm do contrato tipo."];
check("cláusula do template aprovado → SUGGESTED",
  assessContractClause("Comissões conforme 30/70.", TEMPLATES).outcome === "SUGGESTED");
const m1 = assessContractClause("A IA inventa 15% para o intermediário.", TEMPLATES);
check("cláusula monetária inventada → BLOCKED (fins pela comissão)",
  m1.outcome === "BLOCKED" && m1.reason?.includes("monetária"));
check("cláusula nova não monetária → BLOCKED (fora template)",
  assessContractClause("Tolerância de 1000 coisas novas.", TEMPLATES).outcome === "BLOCKED");
check("cláusula vazia → BLOCKED",
  assessContractClause("   ", TEMPLATES).outcome === "BLOCKED");

// (c) Valores vs. comissão 30/70
check("valor bate com a comissão → SUGGESTED",
  assessAmountAgainstCommission({ suggestedCents: 300_000_00n, expectedCents: 300_000_00n }).outcome === "SUGGESTED");
const m2 = assessAmountAgainstCommission({ suggestedCents: 500_000_00n, expectedCents: 300_000_00n });
check("IA inventa valor → BLOCKED e explica a divergência",
  m2.outcome === "BLOCKED" && m2.reason?.includes("30000000") && m2.reason?.includes("50000000"));
check("tolerância de 1 cêntimo aceita",
  assessAmountAgainstCommission({ suggestedCents: 300_000_01n, expectedCents: 300_000_00n, toleranceCents: 1n }).outcome === "SUGGESTED");
check("valores inválidos → BLOCKED",
  assessAmountAgainstCommission({ suggestedCents: 0n, expectedCents: 0n }).outcome === "BLOCKED");

// (d) Registo idempotente
const h = hashInput("vendedor", "SLA", undefined);
check("hashInput estável e deterministico",
  h === hashInput("vendedor", "SLA") && h.length === 64);
check("hashPrompt ordena parâmetros (canónico)",
  hashPrompt("t", { b: "2", a: "1" }) === hashPrompt("t", { a: "1", b: "2" }));

const action = logAiAction({
  operation: "suggest",
  model: "claude-sonnet-5",
  modelVersion: "2026.1",
  inputHash: h,
  prompt: "Sugere título para o anúncio.",
  promptParams: { categoria: "IMOVEL" },
  outcome: { titulo: "Moradia V2 em Talatona" },
  confidence: 0.93,
  suggestedById: "system.ia",
  listingId: "l1",
  nowIso: "2026-04-01T12:00:00.000Z",
});
check("logAiAction devolve registo idempotente e com promptHash",
  action.status === "SUGGESTED" && action.id === `claude-sonnet-5:${h}:suggest`
  && action.promptHash.length === 64 && action.listingId === "l1");
check("log exig saga inputHash",
  logAiAction({ operation: "suggest", model: "m", modelVersion: "1", inputHash: "", outcome: {}, confidence: 0.9 }).error !== undefined);
check("confiança fora de 0..1 → recusa",
  logAiAction({ operation: "suggest", model: "m", modelVersion: "1", inputHash: "x", outcome: {}, confidence: 2 }).error !== undefined);

const aprovado = approveAiAction(action, { approvedById: "admin1", nowIso: "2026-04-01T13:00:00.000Z" });
check("aprovação humana → APPROVED com identificação",
  aprovado.status === "APPROVED" && aprovado.approvedById === "admin1" && aprovado.approvedAt === "2026-04-01T13:00:00.000Z");
check("re-aprovar → recusa (idempotente)",
  approveAiAction(aprovado, { approvedById: "admin2" }).error !== undefined);
check("BLOCKED não é aprovável",
  approveAiAction({ ...action, status: "BLOCKED" }, { approvedById: "admin1" }).error?.includes("guarda-redes") === true);

const recusado = rejectAiAction(action, { rejectedById: "agente2", nowIso: "2026-04-01T13:00:00.000Z" });
check("recusar → REJECTED; aprovado não recusa",
  recusado.status === "REJECTED" && recusado.rejectedById === "agente2"
  && rejectAiAction(aprovado, { rejectedById: "agente2" }).error !== undefined);

const comDiff = applyChanges(aprovado, [{ entity: "listing", field: "title", from: "x", to: "Moradia V2 em Talatona" }]);
check("aplicar só depois de aprovação (grava diff)",
  comDiff.appliedChanges?.length === 1 && applyChanges(action, []).error !== undefined);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);