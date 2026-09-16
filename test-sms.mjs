// ---------------------------------------------------------------------------
// test-sms.mjs — testes unitários do wrapper KambaSMS (lib/sms/kambasms.ts)
// Não faz chamadas à API — valida normalização, validação e fallback sem chave.
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

// Importa as funções puras (o módulo é ESM com types — usar --experimental-strip-types)
// Nota: sendSms/sendOtpSms requerem fetch + API — testamos só as funções puras.
// Para testar as funções de envio, necessário mock ou KAMBA_API_KEY.

// --- normalPhone ---

const { normalizePhone, validateMessage } = await import("./lib/sms/kambasms.ts");

test("normalizePhone: número sem prefixo", () => {
  assert.equal(normalizePhone("923456789"), "+244923456789");
});

test("normalizePhone: número com +244", () => {
  assert.equal(normalizePhone("+244923456789"), "+244923456789");
});

test("normalizePhone: número com 244 sem +", () => {
  assert.equal(normalizePhone("244923456789"), "+244923456789");
});

test("normalizePhone: número com espaços", () => {
  assert.equal(normalizePhone("923 456 789"), "+244923456789");
});

test("normalizePhone: número com traços", () => {
  assert.equal(normalizePhone("923-456-789"), "+244923456789");
});

test("normalizePhone: número completo com espaços", () => {
  assert.equal(normalizePhone("+244 923 456 789"), "+244923456789");
});

// --- validateMessage ---

test("validateMessage: mensagem válida", () => {
  const r = validateMessage("Codigo: 123456");
  assert.equal(r.ok, true);
});

test("validateMessage: excede 160 caracteres", () => {
  const r = validateMessage("A".repeat(161));
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("160"));
});

test("validateMessage: contém URL http", () => {
  const r = validateMessage("Visite http://example.com");
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("URL"));
});

test("validateMessage: contém URL www", () => {
  const r = validateMessage("Visite www.example.com");
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("URL"));
});

test("validateMessage: contém .com", () => {
  const r = validateMessage("Acesse example.com");
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("URL"));
});

test("validateMessage: contém .ao", () => {
  const r = validateMessage("Acesse site.ao");
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("URL"));
});

test("validateMessage: contém emoji", () => {
  const r = validateMessage("Olá! 🚀");
  assert.equal(r.ok, false);
  assert.ok(r.reason?.includes("emoji"));
});

test("validateMessage: exatamente 160 caracteres é válido", () => {
  const r = validateMessage("A".repeat(160));
  assert.equal(r.ok, true);
});

// --- sendSms / sendOtpSms: fallback sem chave ---

const { sendSms, sendOtpSms } = await import("./lib/sms/kambasms.ts");

test("sendSms: retorna skipped sem KAMBA_API_KEY", async () => {
  const original = process.env.KAMBA_API_KEY;
  delete process.env.KAMBA_API_KEY;
  const r = await sendSms("+244923456789", "Teste");
  assert.equal(r.skipped, true);
  assert.equal(r.ok, false);
  if (original) process.env.KAMBA_API_KEY = original;
});

test("sendOtpSms: retorna skipped sem KAMBA_API_KEY", async () => {
  const original = process.env.KAMBA_API_KEY;
  delete process.env.KAMBA_API_KEY;
  const r = await sendOtpSms("+244923456789");
  assert.equal(r.skipped, true);
  assert.equal(r.ok, false);
  if (original) process.env.KAMBA_API_KEY = original;
});

test("sendSms: rejeita número inválido", async () => {
  const original = process.env.KAMBA_API_KEY;
  process.env.KAMBA_API_KEY = "kamba_test_fake";
  const r = await sendSms("12345", "Teste");
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes("inválido"));
  if (original) process.env.KAMBA_API_KEY = original;
  else delete process.env.KAMBA_API_KEY;
});

test("sendOtpSms: rejeita número inválido", async () => {
  const original = process.env.KAMBA_API_KEY;
  process.env.KAMBA_API_KEY = "kamba_test_fake";
  const r = await sendOtpSms("abc");
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes("inválido"));
  if (original) process.env.KAMBA_API_KEY = original;
  else delete process.env.KAMBA_API_KEY;
});

test("sendSms: rejeita mensagem com URL", async () => {
  const original = process.env.KAMBA_API_KEY;
  process.env.KAMBA_API_KEY = "kamba_test_fake";
  const r = await sendSms("+244923456789", "Visite http://example.com");
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes("URL"));
  if (original) process.env.KAMBA_API_KEY = original;
  else delete process.env.KAMBA_API_KEY;
});

// --- Resumo ---

console.log(`\n${pass + fail} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
