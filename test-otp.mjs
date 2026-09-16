// Testes OTP (spec v3 §5/§13) — correr: node --experimental-strip-types test-otp.mjs
import { issueOtp, verifyOtp, OTP_MAX_ATTEMPTS } from "./lib/otp.ts";

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  if (ok) { pass++; console.log(`PASS | ${label}`); }
  else { fail++; console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`); }
};

const T0 = new Date("2026-04-10T10:00:00.000Z");
const U = "u-100";

// 1) o payload devolvido nunca expõe o hash; a store guarda só o sha256 (64 hex)
const captureStore = new (class {
  constructor() { this.rows = []; }
  save(r) { this.rows.push(r); }
  findActive() { return this.rows[0] ?? null; }
  update(r) { this.rows[0] = r; }
})();
const p1 = issueOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "123456", now: T0, store: captureStore });
check("payload não contém codeHash", p1.code === "123456" && p1.codeHash === undefined);
const saved = captureStore.rows[0];
check("store grava apenas o hash (64 hex, ≠ código)", /^[0-9a-f]{64}$/.test(saved.codeHash) && saved.codeHash !== "123456");

// 2) verificação correta + consumo único
issueOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "123456", now: T0 });
let r2 = verifyOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "123456", now: T0 });
check("código correto verificado", r2.ok === true);
r2 = verifyOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "123456", now: T0 });
check("consumido → não volta a passar", r2.ok === false && r2.reason === "USED");

// 3) código errado incrementa tentativas
issueOtp({ userId: U, purpose: "RESET_PASSWORD", code: "000001", now: T0 });
let r3 = verifyOtp({ userId: U, purpose: "RESET_PASSWORD", code: "000002", now: T0 });
check("código errado → WRONG_CODE", r3.ok === false && r3.reason === "WRONG_CODE");
r3 = verifyOtp({ userId: U, purpose: "RESET_PASSWORD", code: "000001", now: T0 });
check("ainda válido após 1 erro", r3.ok === true);

// 4) máximo de tentativas bloqueia mesmo o código certo
issueOtp({ userId: U, purpose: "CHANGE_IBAN", code: "555555", now: T0 });
for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) verifyOtp({ userId: U, purpose: "CHANGE_IBAN", code: "999999", now: T0 });
const r4 = verifyOtp({ userId: U, purpose: "CHANGE_IBAN", code: "555555", now: T0 });
check("após N tentativas falhadas → MAX_ATTEMPTS", r4.ok === false && r4.reason === "MAX_ATTEMPTS");

// 5) expirado
issueOtp({ userId: U, purpose: "MFA_PHONE", code: "777777", now: T0, ttlMs: 60_000 });
const r5 = verifyOtp({ userId: U, purpose: "MFA_PHONE", code: "777777", now: new Date(T0.getTime() + 61_000) });
check("expirado → EXPIRED", r5.ok === false && r5.reason === "EXPIRED");

// 6) propósito errado não encontra (chaves separadas)
issueOtp({ userId: U, purpose: "SELLER_CONFIRM_RECEIPT", code: "888888", now: T0 });
const r6 = verifyOtp({ userId: U, purpose: "EMAIL_VERIFICATION", code: "888888", now: T0 });
check("propósito diferente → NOT_FOUND", r6.ok === false && r6.reason === "NOT_FOUND");

// 7) emitir novo invalida o anterior (anti-spam/reutilização)
issueOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "111111", now: T0 });
issueOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "222222", now: T0 });
const r7 = verifyOtp({ userId: U, purpose: "PHONE_VERIFICATION", code: "111111", now: T0 });
check("novo OTP invalida o anterior (código velho não serve)", r7.ok === false && r7.reason === "WRONG_CODE");

// 8) código aleatório (sem injeção) tem tamanho certo
const p8 = issueOtp({ userId: U, purpose: "EMAIL_VERIFICATION", code: "333333", now: T0 });
check("formato do payload", typeof p8.code === "string" && p8.code.length === 6 && Number.isInteger(Number(p8.code)));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);