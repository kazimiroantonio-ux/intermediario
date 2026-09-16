// Testes dos relatórios da direção (spec v3 — prioridade 11).
// Correr: node --experimental-strip-types test-reports.mjs

import { buildDashboard } from "./lib/reports.ts";

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
const W = (id, queue, p, status, deadlineIso) => ({
  id,
  queue, category: "x", entityType: "TICKET", subjectId: id, priority: p, status,
  deadlineIso, escalateLevel: 0, history: [], createdAtIso: NOW, updatedAtIso: NOW,
});

const dash = buildDashboard({
  nowIso: NOW,
  deals: [
    { state: "EM_NEGOCIACAO", createdAtIso: "2026-03-01T00:00:00.000Z" },
    { state: "EM_NEGOCIACAO", createdAtIso: "2026-03-05T00:00:00.000Z" },
    { state: "ACORDO", createdAtIso: "2026-03-10T00:00:00.000Z" },
  ],
  listings: [
    { status: "ACTIVE", expiresAtIso: "2026-05-01T00:00:00.000Z" },
    { status: "ACTIVE", expiresAtIso: "2026-03-20T00:00:00.000Z" }, // EXPIRING_SOON
    { status: "PENDING_VERIFICATION", expiresAtIso: "2026-06-01T00:00:00.000Z" },
  ],
  payments: [
    { dealId: "d1", phase: "RECONCILIADO", amountCents: 1_000_000n, reconciledAt: "2026-03-15T00:00:00.000Z", createdAtIso: "2026-03-01T00:00:00.000Z" },
    { dealId: "d2", phase: "RECONCILIADO", amountCents: 2_500_000n, createdAtIso: "2026-03-10T00:00:00.000Z" },
    { dealId: "d3", phase: "AGUARDA_PAGAMENTO", amountCents: 3_000_000n, createdAtIso: "2026-04-01T00:00:00.000Z" },
    { dealId: "d4", phase: "FALHOU", amountCents: 500_000n, createdAtIso: "2026-03-02T00:00:00.000Z" },
  ],
  verifications: [
    { subjectType: "SELLER", status: "VERIFIED", riskLevel: "NORMAL", createdAtIso: "2026-03-01T00:00:00.000Z", approvedAtIso: "2026-03-02T00:00:00.000Z" },
    { subjectType: "SELLER", status: "VERIFIED", riskLevel: "NORMAL", createdAtIso: "2026-03-01T00:00:00.000Z", approvedAtIso: "2026-03-02T00:00:00.000Z" },
    { subjectType: "SELLER", status: "REJECTED", riskLevel: "NORMAL", createdAtIso: "2026-03-01T00:00:00.000Z" },
    { subjectType: "SELLER", status: "NEEDS_MORE_INFO", riskLevel: "HIGH", createdAtIso: "2026-03-01T00:00:00.000Z" },
    { subjectType: "SELLER", status: "SUBMITTED", riskLevel: "NORMAL", createdAtIso: "2026-03-01T00:00:00.000Z" },
  ],
  queueItems: [
    W("w1", "VERIFICATION", "MEDIA", "EM_CURSO", "2026-03-30T00:00:00.000Z"), // overdue
    W("w2", "VERIFICATION", "BAIXA", "NOVO", "2026-04-10T00:00:00.000Z"),
    W("w3", "FINANCIAL", "ALTA", "ATRIBUIDO", "2026-04-05T00:00:00.000Z"),
    { ...W("w4", "SUPPORT", "MEDIA", "CONCLUIDO", "2026-03-01T00:00:00.000Z") },
  ],
  disputesOpen: 1,
});

check("massa agrega contar de negócios/anúncios",
  dash.mass.deals === 3 && dash.mass.listings === 3 && dash.mass.openDisputes === 1);
check("negócios por estado",
  dash.dealsByState.EM_NEGOCIACAO === 2 && dash.dealsByState.ACORDO === 1);
check("anúncios com EXPIRING_SOON derivado",
  dash.listingsByStatus.ACTIVE === 2 && dash.listingsByStatus.EXPIRING_SOON === 1 && dash.listingsByStatus.PENDING_VERIFICATION === 1);

check("receita reconciliada soma (Kz)",
  dash.revenue.reconciledKz === "3500000" && dash.revenue.pendingKz === "3000000");
check("receita por mês agrupada e ordenada",
  dash.revenue.byMonth.length === 2
  && dash.revenue.byMonth[0].month === "2026-03" && dash.revenue.byMonth[0].reconciledKz === "3500000"
  && dash.revenue.byMonth[1].month === "2026-04" && dash.revenue.byMonth[1].pendingKz === "3000000");
check("falhas financieras contadas no risco",
  dash.risk.failures === 1);

check("verificação: aprovadas 2, rejeitada 1, pendentes 2, alto risco 1",
  dash.verification.verified === 2 && dash.verification.rejected === 1
  && dash.verification.pending === 2 && dash.verification.highRiskPending === 1);
check("taxa de aprovação 67% (2 aprovadas / 3 decididas+pendentes)",
  dash.verification.approvalRatePct === 67);

check("filas: por fila, atrasos e SLA",
  dash.queues.byQueue.VERIFICATION === 2 && dash.queues.byQueue.FINANCIAL === 1 && dash.queues.byQueue.SUPPORT === undefined
  && dash.queues.overdue === 1 && dash.queues.slaCompliancePct === 67);

const vazio = buildDashboard({ nowIso: NOW, deals: [], listings: [], payments: [], verifications: [], queueItems: [], disputesOpen: 0 });
check("sem dados → dashboard vazio determinístico (sem divisões por zero)",
  vazio.mass.deals === 0 && vazio.verification.approvalRatePct === 0 && vazio.queues.slaCompliancePct === 100);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);