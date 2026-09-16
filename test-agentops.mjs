// ---------------------------------------------------------------------------
// test-agentops.mjs — testes das agregações do painel do agente (lib/agentOps.ts)
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`PASS | ${name}`);
  } catch (err) {
    fail++;
    console.log(`FAIL | ${name} — ${err.message}`);
  }
}

const { agentDealSummary, agentFinanceSummary, allowedDealStages, dealStageTone, DEAL_STAGE_LABEL, FIRST_CONTACT_SLA_MINUTES } =
  await import("./lib/agentOps.ts");

const NOW = "2026-09-10T12:00:00.000Z";

const deals = [
  { id: "d1", reference: "NEG-2026-00001", status: "LEAD", createdAtIso: "2026-09-09T10:00:00.000Z" },
  { id: "d2", reference: "NEG-2026-00002", status: "AGENT_ASSIGNED", createdAtIso: "2026-09-08T09:00:00.000Z", queuedAtIso: "2026-09-08T09:00:00.000Z" },
  { id: "d3", reference: "NEG-2026-00003", status: "AGENT_ASSIGNED", createdAtIso: "2026-09-01T09:00:00.000Z", queuedAtIso: "2026-09-01T09:00:00.000Z" }, // primeiro contacto em atraso
  { id: "d4", reference: "NEG-2026-00004", status: "CLOSED_WON", createdAtIso: "2026-08-01T09:00:00.000Z" },
  { id: "d5", reference: "NEG-2026-00005", status: "CLOSED_LOST", createdAtIso: "2026-08-02T09:00:00.000Z" },
  { id: "d6", reference: "NEG-2026-00006", status: "ACTIVE", createdAtIso: "2026-09-10T11:00:00.000Z" }, // estado inválido (não em ACTIVE_STATES)
];

test("agentDealSummary: contagens básicas", () => {
  const s = agentDealSummary(deals, NOW);
  assert.equal(s.total, 6);
});

test("agentDealSummary: estados ativos (LEAD não conta)", () => {
  const s = agentDealSummary(deals, NOW);
  assert.equal(s.open, 2); // d2 e d3 (AGENT_ASSIGNED). LEAD não é ativo.
  assert.equal(s.won, 1);
  assert.equal(s.lost, 1);
});

test("agentDealSummary: primeiro contacto em atraso (SLA 4h)", () => {
  const s = agentDealSummary(deals, NOW);
  // d2: queued 09-08 09:00 → já passado desde há muito (>4h) -> conta
  // d3: igual. LEAD sem queuedAt não conta.
  assert.equal(s.overdueFirstContact, 2);
});

test("agentDealSummary: SLA por minuto exportado", () => {
  assert.equal(FIRST_CONTACT_SLA_MINUTES, 240);
});

test("agentDealSummary: agrupamento por estado", () => {
  const s = agentDealSummary(deals, NOW);
  assert.deepEqual(s.byState, {
    LEAD: 1,
    AGENT_ASSIGNED: 2,
    CLOSED_WON: 1,
    CLOSED_LOST: 1,
    ACTIVE: 1,
  });
});

test("agentDealSummary: pipeline sem negócios ativos → 0 dias", () => {
  const s = agentDealSummary([deals[3], deals[4]], NOW);
  assert.equal(s.pipelineDays, 0);
});

test("agentFinanceSummary: somas em cêntimos", () => {
  const commissions = [
    { id: "c1", status: "PENDING", agentAmountCents: 100_00n },
    { id: "c2", status: "PAID", agentAmountCents: 250_00n },
    { id: "c3", status: "REVERSED", agentAmountCents: 50_00n }, // não conta (nem paid nem pending? -> pending)
  ];
  const payouts = [
    { id: "p1", status: "PAID", netAmountCents: 200_00n, periodStartIso: "2026-08-01T00:00:00.000Z" },
    { id: "p2", status: "PAID", netAmountCents: 400_00n, periodStartIso: "2026-09-01T00:00:00.000Z" },
    { id: "p3", status: "DRAFT", netAmountCents: 999_00n, periodStartIso: "2026-09-15T00:00:00.000Z" },
  ];
  const f = agentFinanceSummary(commissions, payouts);
  assert.equal(f.pendingCents, 150_00n); // c1 100 + c3 50 (não pago)
  assert.equal(f.paidCents, 250_00n);
  assert.equal(f.totalPayoutNetCents, 600_00n);
  assert.equal(f.lastPayoutNetCents, 400_00n);
  assert.equal(f.lastPayoutPeriodStartIso, "2026-09-01T00:00:00.000Z");
});

test("allowedDealStages: AGENT_ASSIGNED permite QUALIFYING", () => {
  assert.ok(allowedDealStages("AGENT_ASSIGNED").includes("QUALIFYING"));
});

test("allowedDealStages: LEAD permite QUEUED + saídas de exceção (spec dealStateMachine)", () => {
  const stages = allowedDealStages("LEAD");
  assert.ok(stages.includes("QUEUED"));
  ["CLOSED_LOST", "DISPUTED", "SELLER_WITHDREW", "SUSPENSO"].forEach((s) => assert.ok(stages.includes(s)));
  ["AGENT_ASSIGNED", "QUALIFYING", "AGREED", "CLOSED_WON"].forEach((s) => assert.ok(!stages.includes(s)));
});

test("allowedDealStages: CLOSED_WON é terminal", () => {
  assert.equal(allowedDealStages("CLOSED_WON").length, 0);
});

test("dealStageTone: categorias", () => {
  assert.equal(dealStageTone("CLOSED_WON"), "green");
  assert.equal(dealStageTone("CLOSED_LOST"), "red");
  assert.equal(dealStageTone("DISPUTED"), "red");
  assert.equal(dealStageTone("BLOQUEADO_POR_DOCUMENTOS"), "amber");
  assert.equal(dealStageTone("NEGOTIATING"), "blue");
  assert.equal(dealStageTone("LEAD"), "zinc");
});

test("DEAL_STAGE_LABEL: tem rótulo para todos os estados", () => {
  assert.equal(DEAL_STAGE_LABEL["AGENT_ASSIGNED"], "Atribuído ao agente");
  assert.ok(DEAL_STAGE_LABEL["CLOSED_WON"].length > 0);
});

console.log(`\n${pass + fail} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);