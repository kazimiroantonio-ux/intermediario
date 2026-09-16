// ---------------------------------------------------------------------------
// test-sellerlabels.mjs — rótulos de apresentação do painel do vendedor
// (components/seller-labels.ts).
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

const { RESERVATION_STATUS_LABEL, DEAL_TYPE_LABEL } = await import("./components/seller-labels.ts");

// ---------------------------------------------------------------------------
// RESERVATION_STATUS_LABEL
// ---------------------------------------------------------------------------

test("RESERVATION_STATUS_LABEL — todos os estados", () => {
  assert.equal(RESERVATION_STATUS_LABEL["PENDING"], "Pendente");
  assert.equal(RESERVATION_STATUS_LABEL["CONFIRMED"], "Confirmada");
  assert.equal(RESERVATION_STATUS_LABEL["REJECTED"], "Rejeitada");
  assert.equal(RESERVATION_STATUS_LABEL["CANCELLED"], "Cancelada");
});

test("RESERVATION_STATUS_LABEL — valor desconhecido retorna undefined", () => {
  assert.equal(RESERVATION_STATUS_LABEL["FOOBAR"], undefined);
});

// ---------------------------------------------------------------------------
// DEAL_TYPE_LABEL
// ---------------------------------------------------------------------------

test("DEAL_TYPE_LABEL — VENDA e ALUGUER", () => {
  assert.equal(DEAL_TYPE_LABEL["VENDA"], "Venda");
  assert.equal(DEAL_TYPE_LABEL["ALUGUER"], "Arrendamento");
});

test("DEAL_TYPE_LABEL — valor desconhecido retorna undefined", () => {
  assert.equal(DEAL_TYPE_LABEL["PERMUTA"], undefined);
});

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);