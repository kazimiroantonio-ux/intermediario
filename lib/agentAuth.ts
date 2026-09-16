// ---------------------------------------------------------------------------
// Guarda de sessão + agente para os route handlers /api/agente/*.
// 401 sem sessão; 403 com sessão sem role de agente ou sem perfil de agente.
// O agente vem sempre da sessão (userId) — nunca do body/query/headers.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { Agent } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeAgent } from "@/lib/agentAccess";
import { assertSameOrigin } from "@/lib/security";

type AgentContext =
  | { ok: true; agent: Agent }
  | { ok: false; response: NextResponse };

type AgentAuthUser = { user: { id: string; role: string }; email: string };

export async function requireAgent(
  request: Request,
  opts?: { csrf?: boolean }
): Promise<AgentContext> {
  if (opts?.csrf) {
    const csrf = assertSameOrigin(request);
    if (csrf) return { ok: false, response: csrf };
  }

  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as AgentAuthUser | null;

  const agent = session
    ? await prisma.agent.findUnique({ where: { userId: session.user.id } })
    : null;

  const decision = authorizeAgent(session, agent);
  if (!decision.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: decision.reason }, { status: decision.status }),
    };
  }

  return { ok: true, agent: agent! };
}