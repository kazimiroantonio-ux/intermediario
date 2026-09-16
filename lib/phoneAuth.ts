// ---------------------------------------------------------------------------
// Login/registo por telemóvel (OTP via SMS) — helpers puros.
// A verificação e a criação de sessão estão a cargo do plugin `phoneNumber`
// do better-auth (app/api/auth/telefone/route.ts reencaminha para os endpoints
// /phone-number/send-otp e /phone-number/verify). Aqui vive só a lógica de
// normalização/máscara de números e a geração de identidade temporária.
// Regra: nunca revelar na resposta se o número já tem conta.
// ---------------------------------------------------------------------------

import { normalizePhone } from "./sms/kambasms.ts";

/** Telemóvel angolano normalizado: +2449XXXXXXXX */
const MOBILE_REGEX = /^\+2449\d{8}$/;

/** Valida e normaliza o número introduzido para login por SMS. */
export function normalizeLoginPhone(
  raw: string
): { ok: true; phone: string } | { ok: false; reason: string } {
  const phone = normalizePhone(raw);
  if (!/^\+244\d{9}$/.test(phone)) {
    return { ok: false, reason: "Número inválido. Ex.: +244 923 456 789." };
  }
  if (!MOBILE_REGEX.test(phone)) {
    return { ok: false, reason: "Use um número de telemóvel angolano (9XXXXXXXX)." };
  }
  return { ok: true, phone };
}

/** Email temporário gerado para quem entra só por telemóvel. */
export function phoneToTempEmail(phone: string): string {
  return `${phone.slice(1)}@telefone.ointermediario.ao`;
}

/** Nome temporário legível para o novo utilizador (user pode alterar depois). */
export function phoneToTempName(phone: string): string {
  return `Conta ${maskPhone(phone)}`;
}

/** Máscara para ecrã: +244 9** *** 789 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  const tail = digits.slice(-3);
  const prefix = digits.slice(0, digits.length - 3);
  return `${prefix.slice(0, 4)}${"*".repeat(Math.max(prefix.length - 4, 0))}${tail}`;
}

// ---------------------------------------------------------------------------
// Suporte dev: sem KAMBA_API_KEY o código do OTP não é entregue por SMS —
// fica disponível no servidor e é devolvido na resposta (só em desenvolvimento)
// para a página conseguir testar o fluxo localmente.
// ---------------------------------------------------------------------------

const devCodes = new Map<string, string>();

export function storeDevOtpCode(phone: string, code: string): void {
  if (process.env.KAMBA_API_KEY || process.env.NODE_ENV === "production") return;
  devCodes.set(phone, code);
}

export function takeDevOtpCode(phone: string): string | null {
  const code = devCodes.get(phone) ?? null;
  if (code) devCodes.delete(phone);
  return code;
}