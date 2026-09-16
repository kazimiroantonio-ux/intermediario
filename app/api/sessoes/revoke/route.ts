import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import { planRevokeOne, planRevokeOthers } from "@/lib/sessions";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const rl = rateLimit(`sessoes:revoke:${session.user.id}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { id?: unknown; all?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const sessions = await auth.api.listSessions({ headers: request.headers });
  const currentToken = session.session.token;

  if (body.all === true) {
    const count = planRevokeOthers(sessions, currentToken).length;
    if (count === 0) {
      return NextResponse.json({ error: "Não há outras sessões para terminar." }, { status: 400 });
    }
    await auth.api.revokeOtherSessions({ headers: request.headers });
    return NextResponse.json({ ok: true, revokedCount: count });
  }

  if (typeof body.id === "string" && body.id.trim()) {
    const plan = planRevokeOne(sessions, currentToken, body.id.trim());
    if (!plan.ok) {
      return NextResponse.json({ error: plan.reason }, { status: 400 });
    }
    await auth.api.revokeSession({ headers: request.headers, body: { token: plan.tokens[0] } });
    return NextResponse.json({ ok: true, revokedCount: 1 });
  }

  return NextResponse.json(
    { error: "Especifique uma sessão (id) ou all:true." },
    { status: 400 }
  );
}