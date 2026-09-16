import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { normalizeLoginPhone, takeDevOtpCode } from "@/lib/phoneAuth";

// ---------------------------------------------------------------------------
// Login/registo por telemóvel (Fase 2, bloco 1).
// Valida e normaliza o número, aplica rate limit próprio (IP + número) e
// reencaminha para os endpoints do plugin `phoneNumber` do better-auth
// (que geram/guardam o OTP e criam a sessão com Set-Cookie correta).
// Nunca revela se o número já tem conta (anti-enumeração).
// Em desenvolvimento, sem KAMBA_API_KEY, devolve o código na resposta para
// testar o fluxo (no servidor fica sempre nos logs).
// ---------------------------------------------------------------------------

const REQUEST_MAX = 3; // pedidos de código por número / 10 min
const VERIFY_MAX = 5; // tentativas de verificação por número / 10 min

async function pluginEndpoint(
  path: "/phone-number/send-otp" | "/phone-number/verify",
  baseRequest: Request,
  body: Record<string, unknown>
): Promise<Response> {
  const url = new URL(baseRequest.url);
  url.pathname = `/api/auth${path}`;
  url.search = "";
  return auth.handler(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: baseRequest.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
    })
  );
}

function ptError(message?: string, status = 400): string {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("attempts") || msg.includes("too many"))
    return "Demasiadas tentativas. Peça um novo código mais tarde.";
  if (msg.includes("invalid") || msg.includes("wrong") || msg.includes("expired"))
    return "Código inválido ou expirado. Peça um novo código.";
  if (msg.includes("phone") || msg.includes("number"))
    return "Número de telemóvel inválido.";
  return "Não foi possível concluir. Tente novamente.";
}

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  let body: { action?: string; numero?: string; codigo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const action = String(body.action ?? "");
  if (action !== "request" && action !== "verify") {
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  }

  const parsed = normalizeLoginPhone(String(body.numero ?? ""));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }
  const { phone } = parsed;

  if (action === "request") {
    const byPhone = rateLimit(`telefone:req:${phone}`, REQUEST_MAX, 10 * 60 * 1000);
    if (!byPhone.ok) {
      return NextResponse.json(
        { error: "Pediu demasiados códigos. Tente dentro de alguns minutos." },
        { status: 429, headers: { "Retry-After": String(byPhone.retryAfterSec) } }
      );
    }
    const byIp = rateLimit(`telefone:req:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (!byIp.ok) {
      return NextResponse.json(
        { error: "Muitos pedidos deste aparelho. Tente mais tarde." },
        { status: 429, headers: { "Retry-After": String(byIp.retryAfterSec) } }
      );
    }

    const res = await pluginEndpoint("/phone-number/send-otp", request, { phoneNumber: phone });
    if (!res.ok) {
      const parsedErr = await res.json().catch(() => ({}));
      const message = (parsedErr as { error?: { message?: string } }).error?.message;
      return NextResponse.json(
        { error: ptError(message, res.status) },
        { status: res.status, headers: { "Retry-After": "300" } }
      );
    }

    const devCode = takeDevOtpCode(phone);
    return NextResponse.json(devCode ? { ok: true, devCode, dev: true } : { ok: true });
  }

  // verify
  const codigo = String(body.codigo ?? "").replace(/\D/g, "");
  if (codigo.length !== 6) {
    return NextResponse.json({ error: "O código tem de ter 6 dígitos." }, { status: 400 });
  }

  const byPhone = rateLimit(`telefone:verify:${phone}`, VERIFY_MAX, 10 * 60 * 1000);
  if (!byPhone.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Peça um novo código." },
      { status: 429, headers: { "Retry-After": String(byPhone.retryAfterSec) } }
    );
  }
  const byIp = rateLimit(`telefone:verify:ip:${clientIp(request)}`, 15, 10 * 60 * 1000);
  if (!byIp.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas deste aparelho. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSec) } }
    );
  }

  const res = await pluginEndpoint("/phone-number/verify", request, {
    phoneNumber: phone,
    code: codigo,
  });
  if (!res.ok) {
    const parsedErr = await res.json().catch(() => ({}));
    const message = (parsedErr as { error?: { message?: string } }).error?.message;
    return NextResponse.json({ error: ptError(message, res.status) }, { status: res.status });
  }

  // Repassa as cookies de sessão definidas pelo better-auth.
  const headers = new Headers();
  const setCookie = res.headers.getSetCookie?.() ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  for (const c of setCookie) headers.append("set-cookie", c);
  headers.set("content-type", "application/json");
  return new NextResponse(await res.text(), { status: 200, headers });
}