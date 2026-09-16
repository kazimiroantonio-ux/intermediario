// ---------------------------------------------------------------------------
// test-agentaccess.mjs — autorização do painel do agente (lib/agentAccess.ts)
// 401 sem sessão; 403 com sessão sem permissão/perfil.
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

const { authorizeAgent } = await import("./lib/agentAccess.ts");

test("401 quando não há sessão (mesmo com perfil)", () => {
  const r = authorizeAgent(null, { id: "ag1" });
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test("403 quando a sessão pertence a um não-agente", () => {
  const r = authorizeAgent({ user: { role: "USER" } }, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("403 quando a role é de agente mas não há perfil de agente", () => {
  const r = authorizeAgent({ user: { role: "AGENT" } }, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("ok quando role AGENT + perfil: devolve agentId da sessão", () => {
  const r = authorizeAgent({ user: { role: "AGENT" } }, { id: "ag-42" });
  assert.ok(r.ok);
  assert.equal(r.agentId, "ag-42");
});

test("ADMIN não acede ao painel do agente (sem role AGENT) — 403", () => {
  const r = authorizeAgent({ user: { role: "ADMIN" } }, { id: "ag-1" });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

console.log(`\n${pass + fail} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);