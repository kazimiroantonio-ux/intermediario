// ---------------------------------------------------------------------------
// test-agentlabels.mjs — rótulos de apresentação batem EXATAMENTE com os
// valores reais dos enums do schema (evita drift entre UI e BD).
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

const {
  AGENT_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  PAYOUT_STATUS_LABEL,
  BANK_ACCOUNT_STATUS_LABEL,
  formatCentsToKz,
  maskIban,
} = await import("./components/agent-labels.ts");

function assertExactKeys(map, expected, name) {
  const keys = Object.keys(map).sort();
  assert.deepEqual(keys, [...expected].sort(), `${name}: chaves devem ser exatamente ${expected.join(", ")}`);
  for (const k of keys) {
    assert.ok(
      typeof map[k] === "string" && map[k].length > 0,
      `${name}[${k}] deve ter um rótulo não vazio`
    );
  }
}

test("AGENT_STATUS_LABEL: exatamente o enum AgentStatus", () => {
  assertExactKeys(AGENT_STATUS_LABEL, ["PENDING_REVIEW", "APPROVED", "SUSPENDED", "REJECTED", "INACTIVE"], "AGENT_STATUS_LABEL");
});

test("COMMISSION_STATUS_LABEL: exatamente o enum CommissionStatus", () => {
  assertExactKeys(COMMISSION_STATUS_LABEL, ["PENDING", "ACCRUED", "PAYABLE", "PAID", "REVERSED", "DISPUTED"], "COMMISSION_STATUS_LABEL");
});

test("PAYOUT_STATUS_LABEL: exatamente o enum PayoutStatus", () => {
  assertExactKeys(PAYOUT_STATUS_LABEL, ["DRAFT", "APPROVED", "PROCESSING", "PAID", "FAILED"], "PAYOUT_STATUS_LABEL");
});

test("BANK_ACCOUNT_STATUS_LABEL: exatamente o enum BankAccountStatus", () => {
  assertExactKeys(BANK_ACCOUNT_STATUS_LABEL, ["PENDENTE", "EM_VERIFICACAO", "VERIFICADO", "REJEITADO", "SUSPENSO", "SUBSTITUIDO"], "BANK_ACCOUNT_STATUS_LABEL");
});

test("formatCentsToKz: aceita bigint/string/number (cêntimos → Kwanza)", () => {
  // pt-AO usa espaço não separável como separador de milhares.
  assert.equal(formatCentsToKz(1_000_000n), "AOA 10\u00A0000");
  assert.equal(formatCentsToKz("250000"), "AOA 2\u00A0500");
  assert.equal(formatCentsToKz(0), "AOA 0");
});

test("maskIban: nunca expõe o IBAN completo", () => {
  assert.equal(maskIban("AO06004400006729503010132"), "•••• 0132");
  assert.equal(maskIban(""), null);
  assert.equal(maskIban(null), null);
});

console.log(`\n${pass + fail} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);