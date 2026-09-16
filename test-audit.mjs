// Testes de auditoria append-only (spec v3 sec. 5 — logs protegidos contra
// alteração). Correr: node --experimental-strip-types test-audit.mjs

import {
  createAuditEvent,
  verifyAuditEvent,
  verifyAuditChain,
  canonicalJson,
  hashAuditPayload,
} from "./lib/audit.ts";

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

// ---- Determinismo ----
check("canonicalJson: ordem das chaves irrelevante",
  canonicalJson({ a: 1, b: [1, 2], c: { z: 1, y: 2 } })
  === canonicalJson({ c: { y: 2, z: 1 }, b: [1, 2], a: 1 }));
check("canonicalJson: BigInt serializa como string",
  canonicalJson({ v: 123n }) === '{"v":"123"}');

// ---- Construção e cadeia ----
const t0 = createAuditEvent(
  { occurrenceId: "e1", actorType: "USER", actorId: "u1", action: "login", domain: "user", entityId: "u1", ip: "10.0.0.1" },
  undefined,
  "2026-01-01T00:00:00.000Z"
);
const t1 = createAuditEvent(
  { occurrenceId: "e2", actorType: "OPERATOR", actorId: "op2", action: "deal.transform", domain: "deal", entityId: "d9", reason: "aprovação", metadata: { from: "DEPOSIT_PAYING", to: "DEPOSIT_PAID" } },
  t0.hash,
  "2026-01-01T00:01:00.000Z"
);
const t2 = createAuditEvent(
  { occurrenceId: "e3", actorType: "AI", actorId: "ai-doc", action: "ai.extract", domain: "document", entityId: "doc1", device: "worker-1" },
  t1.hash,
  "2026-01-01T00:02:00.000Z"
);

check("hash é sha256 hex (64 caracteres)",
  /^[0-9a-f]{64}$/.test(t0.hash) && /^[0-9a-f]{64}$/.test(t1.hash) && /^[0-9a-f]{64}$/.test(t2.hash));
check("evento individual válido",
  verifyAuditEvent(t0).ok && verifyAuditEvent(t1).ok && verifyAuditEvent(t2).ok);
check("cadeia de 3 eventos íntegra",
  verifyAuditChain([t0, t1, t2]).ok);
check("prevHash liga os eventos",
  t1.prevHash === t0.hash && t2.prevHash === t1.hash);
check("hash muda com o conteúdo (mesmo occurrenceId, dados diferentes)",
  hashAuditPayload("", { occurrenceId: "e1", actorType: "USER", actorId: "u1", action: "login", domain: "user", entityId: "u1" }, "2026-01-01T00:00:00.000Z")
  !== hashAuditPayload("", { occurrenceId: "e1", actorType: "USER", actorId: "u2", action: "login", domain: "user", entityId: "u1" }, "2026-01-01T00:00:00.000Z"));

// ---- Deteção de adulteração ----
const tampered = { ...t1, actorId: "MALICIOSO" };
check("adulteração: evento individual detetado",
  !verifyAuditEvent(tampered).ok);
check("adulteração: cadeia quebrada no índice do evento mudado",
  verifyAuditChain([t0, tampered, t2]).ok === false
  && verifyAuditChain([t0, tampered, t2]).brokenAt === 1);
check("adulteração: quebra também o elo seguinte (hash antigo não cola)",
  verifyAuditChain([t0, t1, { ...t2, actorId: "X" }]).ok === false);

const reordered = [t0, t2, t1];
check("reordenação: prevHash não corresponde → cadeia quebrada",
  verifyAuditChain(reordered).ok === false && verifyAuditChain(reordered).brokenAt === 1);

const dup = [t0, t1, { ...t0, occurrenceId: "e3" }];
check("duplicado: occurrenceId repetido → cadeia quebrada",
  verifyAuditChain(dup).ok === false);

// ---- Validação de campos ----
const missing = createAuditEvent(
  { occurrenceId: "", actorType: "USER", actorId: "u1", action: "login", domain: "user", entityId: "u1" },
  undefined,
  "2026-01-01T00:00:00.000Z"
);
check("campos obrigatórios: occurrenceId vazio → inválido",
  !verifyAuditEvent(missing).ok);

const badActor = createAuditEvent(
  { occurrenceId: "x1", actorType: "ROBOT", actorId: "u1", action: "login", domain: "user", entityId: "u1" },
  undefined,
  "2026-01-01T00:00:00.000Z"
);
check("actorType inválido → evento rejeitado",
  !verifyAuditEvent(badActor).ok);

// ---- Cadeia longa + string vazia ----
const chain = [];
let prev;
for (let i = 0; i < 50; i++) {
  const e = createAuditEvent(
    { occurrenceId: `bulk-${i}`, actorType: "SYSTEM", actorId: "scheduler", action: "heartbeat", domain: "system", entityId: "sys" },
    prev,
    `2026-01-02T${String(i).padStart(2, "0")}:00:00.000Z`
  );
  chain.push(e);
  prev = e.hash;
}
const v = verifyAuditChain(chain);
check("cadeia de 50 eventos íntegra",
  v.ok && v.brokenAt === undefined);
check("cadeia vazia é válida",
  verifyAuditChain([]).ok);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);