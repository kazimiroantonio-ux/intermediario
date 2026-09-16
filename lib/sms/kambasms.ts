// ---------------------------------------------------------------------------
// KambaSMS — wrapper leve via fetch nativo (sem SDK externo).
// Envio de SMS e OTP em Angola. Valida formato +244 e regras das operadoras.
// Se KAMBA_API_KEY não estiver definida, devolve { skipped: true } sem explodir.
// Docs: https://kambasms.ao/dashboard/docs
// ---------------------------------------------------------------------------

const KAMBA_BASE_URL = "https://api.kambasms.ao";
const PHONE_REGEX = /^\+244\d{9}$/;
const URL_REGEX = /https?:\/\/|www\.|\.com|\.ao/i;
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

export interface SmsResult {
  ok: boolean;
  messageId?: string;
  remainingBalance?: number;
  skipped?: boolean;
  error?: string;
}

/**
 * Normaliza um número angolano para formato +244XXXXXXXXX.
 * Aceita: 923456789, +244923456789, 244923456789, 923 456 789, etc.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("244") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("9") && digits.length === 9) return `+244${digits}`;
  return raw.startsWith("+244") ? raw : `+244${digits}`;
}

/**
 * Valida se a mensagem cumpre as regras das operadoras angolanas:
 * - Máximo 160 caracteres
 * - Sem URLs (filtrado como spam)
 * - Sem emojis (causam cobrança múltiplo segmento)
 */
export function validateMessage(text: string): { ok: boolean; reason?: string } {
  if (text.length > 160) return { ok: false, reason: `SMS excede 160 caracteres (${text.length}/160).` };
  if (URL_REGEX.test(text)) return { ok: false, reason: "SMS contém URL — bloqueado pelas operadoras." };
  if (EMOJI_REGEX.test(text)) return { ok: false, reason: "SMS contém emoji — não suportado pelas operadoras." };
  return { ok: true };
}

async function kambaFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.KAMBA_API_KEY;
  if (!apiKey) throw new Error("KAMBA_API_KEY não configurada.");

  const res = await fetch(`${KAMBA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(`KambaSMS ${res.status}: ${msg}`);
  }

  return data as T;
}

interface KambaOtpResponse {
  message_id: string;
  remaining_balance?: number;
}

interface KambaSmsResponse {
  message_id: string;
  remaining_balance?: number;
}

/**
 * Envia um SMS simples. Valida formato do número e regras da mensagem.
 * Se KAMBA_API_KEY não estiver definida, devolve { skipped: true }.
 */
export async function sendSms(
  to: string,
  text: string,
  senderId?: string,
): Promise<SmsResult> {
  const apiKey = process.env.KAMBA_API_KEY;
  if (!apiKey) {
    console.warn("[KambaSMS] KAMBA_API_KEY não configurada. SMS ignorado.");
    return { ok: false, skipped: true };
  }

  const phone = normalizePhone(to);
  if (!PHONE_REGEX.test(phone)) {
    return { ok: false, error: `Número inválido: ${to}. Formato esperado: +2449XXXXXXXX.` };
  }

  const msgCheck = validateMessage(text);
  if (!msgCheck.ok) return { ok: false, error: msgCheck.reason };

  try {
    const data = await kambaFetch<KambaSmsResponse>("/sms/send", {
      to: phone,
      text,
      ...(senderId ? { sender_id: senderId } : {}),
    });
    return {
      ok: true,
      messageId: data.message_id,
      remainingBalance: data.remaining_balance,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[KambaSMS] Erro ao enviar SMS:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Envia um OTP via endpoint dedicado da KambaSMS.
 * O servidor gera o código, valida formato e aplica rate limit (3/hora/número).
 * Se KAMBA_API_KEY não estiver definida, devolve { skipped: true }.
 */
export async function sendOtpSms(to: string): Promise<SmsResult> {
  const apiKey = process.env.KAMBA_API_KEY;
  if (!apiKey) {
    console.warn("[KambaSMS] KAMBA_API_KEY não configurada. OTP SMS ignorado.");
    return { ok: false, skipped: true };
  }

  const phone = normalizePhone(to);
  if (!PHONE_REGEX.test(phone)) {
    return { ok: false, error: `Número inválido: ${to}. Formato esperado: +2449XXXXXXXX.` };
  }

  try {
    const data = await kambaFetch<KambaOtpResponse>("/otp/send", { phone });
    return {
      ok: true,
      messageId: data.message_id,
      remainingBalance: data.remaining_balance,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[KambaSMS] Erro ao enviar OTP:", msg);
    return { ok: false, error: msg };
  }
}
