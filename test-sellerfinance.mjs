// ---------------------------------------------------------------------------
// test-sellerfinance.mjs — agregados financeiros do vendedor e resumo de
// negócios (lib/sellerFinance.ts). Valores em cêntimos AOA (BigInt).
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`PASS | ${name}`);
  } catch (e) {
    fail++;
    console.error(`FAIL | ${name}`);
    console.error(`  ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// sellerFinanceSummary
// ---------------------------------------------------------------------------

const { sellerFinanceSummary, sumTransfersMinor, sellerDealSummary } = await import("./lib/sellerFinance.ts");

test("sellerFinanceSummary — comissões pendentes", () => {
  const r = sellerFinanceSummary([
    { totalCommission: 1000n, status: "PENDING" },
    { totalCommission: 2000n, status: "ACCRUED" },
    { totalCommission: 500n, status: "DISPUTED" },
  ]);
  assert.equal(r.pendingMinor, 3500n);
  assert.equal(r.paidMinor, 0n);
  assert.equal(r.revertedMinor, 0n);
});

test("sellerFinanceSummary — comissões pagas", () => {
  const r = sellerFinanceSummary([
    { totalCommission: 5000n, status: "PAID" },
    { totalCommission: 3000n, status: "PAID" },
  ]);
  assert.equal(r.pendingMinor, 0n);
  assert.equal(r.paidMinor, 8000n);
  assert.equal(r.revertedMinor, 0n);
});

test("sellerFinanceSummary — comissões estornadas", () => {
  const r = sellerFinanceSummary([
    { totalCommission: 1500n, status: "REVERSED" },
  ]);
  assert.equal(r.pendingMinor, 0n);
  assert.equal(r.paidMinor, 0n);
  assert.equal(r.revertedMinor, 1500n);
});

test("sellerFinanceSummary — mistura de estados", () => {
  const r = sellerFinanceSummary([
    { totalCommission: 100n, status: "PENDING" },
    { totalCommission: 200n, status: "ACCRUED" },
    { totalCommission: 300n, status: "PAYABLE" },
    { totalCommission: 400n, status: "PAID" },
    { totalCommission: 500n, status: "REVERSED" },
    { totalCommission: 600n, status: "DISPUTED" },
  ]);
  assert.equal(r.pendingMinor, 100n + 200n + 300n + 600n);
  assert.equal(r.paidMinor, 400n);
  assert.equal(r.revertedMinor, 500n);
});

test("sellerFinanceSummary — lista vazia", () => {
  const r = sellerFinanceSummary([]);
  assert.equal(r.pendingMinor, 0n);
  assert.equal(r.paidMinor, 0n);
  assert.equal(r.revertedMinor, 0n);
});

// ---------------------------------------------------------------------------
// sumTransfersMinor
// ---------------------------------------------------------------------------

test("sumTransfersMinor — soma correta", () => {
  assert.equal(sumTransfersMinor([{ amount: 1000n }, { amount: 2000n }]), 3000n);
});

test("sumTransfersMinor — lista vazia", () => {
  assert.equal(sumTransfersMinor([]), 0n);
});

// ---------------------------------------------------------------------------
// sellerDealSummary
// ---------------------------------------------------------------------------

test("sellerDealSummary — negócios abertos, ganhos e perdidos", () => {
  const r = sellerDealSummary([
    { status: "QUEUED" },
    { status: "QUALIFYING" },
    { status: "CLOSED_WON" },
    { status: "REEMBOLSO_CONCLUIDO" },
    { status: "CLOSED_LOST" },
    { status: "EXPIRED_UNPAID" },
    { status: "DISPUTED" },
  ]);
  assert.equal(r.total, 7);
  assert.equal(r.open, 3);
  assert.equal(r.won, 2);
  assert.equal(r.lost, 2);
  assert.equal(r.byState["QUEUED"], 1);
  assert.equal(r.byState["CLOSED_WON"], 1);
});

test("sellerDealSummary — lista vazia", () => {
  const r = sellerDealSummary([]);
  assert.equal(r.total, 0);
  assert.equal(r.open, 0);
  assert.equal(r.won, 0);
  assert.equal(r.lost, 0);
});

test("sellerDealSummary — SELLER_WITHDREW conta como lost", () => {
  const r = sellerDealSummary([{ status: "SELLER_WITHDREW" }]);
  assert.equal(r.lost, 1);
});

test("sellerDealSummary — BUYER_WITHDREW conta como lost", () => {
  const r = sellerDealSummary([{ status: "BUYER_WITHDREW" }]);
  assert.equal(r.lost, 1);
});

test("sellerDealSummary — REEMBOLSO_PENDENTE conta como lost", () => {
  const r = sellerDealSummary([{ status: "REEMBOLSO_PENDENTE" }]);
  assert.equal(r.lost, 1);
});

test("sellerDealSummary — FRAUDE_EM_INVESTIGACAO conta como lost", () => {
  const r = sellerDealSummary([{ status: "FRAUDE_EM_INVESTIGACAO" }]);
  assert.equal(r.lost, 1);
});

test("sellerDealSummary — BLOQUEADO_POR_RISCO conta como open", () => {
  const r = sellerDealSummary([{ status: "BLOQUEADO_POR_RISCO" }]);
  assert.equal(r.open, 1);
});

test("sellerDealSummary — REEMBOLSO_CONCLUIDO conta como won", () => {
  const r = sellerDealSummary([{ status: "REEMBOLSO_CONCLUIDO" }]);
  assert.equal(r.won, 1);
});

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);