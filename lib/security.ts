import { NextResponse } from "next/server";

type JsonError = { error: string };

/**
 * Defesa CSRF para Route Handlers mutantes: exige que o cabeçalho Origin
 * (ou Referer) corresponda ao host da requisição. Pedidos same-origin de
 * browser incluem sempre Origin em POST; clientes sem browser passam por
 * sessão + cookies SameSite=Lax.
 */
export function assertSameOrigin(request: Request): NextResponse<JsonError> | null {
  if (process.env.DISABLE_ORIGIN_CHECK === "true") return null;

  const host = request.headers.get("host");
  if (!host) {
    return errorResponse("Origem inválida.", 403);
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  let sourceHost: string | null = null;
  if (origin) {
    try {
      sourceHost = new URL(origin).host;
    } catch {
      sourceHost = null;
    }
  } else if (referer) {
    try {
      sourceHost = new URL(referer).host;
    } catch {
      sourceHost = null;
    }
  } else {
    // Sem Origin nem Referer: típico de curl/scripts (ok em dev/testes),
    // mas bloqueável via DISABLE_ORIGIN_CHECK=false se desejado.
    return null;
  }

  if (sourceHost !== host) {
    return errorResponse("Pedido entre origens bloqueado.", 403);
  }
  return null;
}

/**
 * Sanitiza texto livre: remove tags/HTML e caracteres de controlo,
 * normaliza espaços e limita o comprimento. Defesa extra contra XSS
 * armazenado (a renderização React já escapa, isto é cinto e suspensório).
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Rate limiter em memória (por processo) para rotas sensíveis fora do
 * better-auth (denúncias, pagamentos, upload). Janela fixa simples —
 * suficiente num único nó; trocar por Upstash Redis em multi-nó.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Housekeeping oportunista
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}

function errorResponse(message: string, status: number): NextResponse<JsonError> {
  return NextResponse.json({ error: message }, { status });
}
