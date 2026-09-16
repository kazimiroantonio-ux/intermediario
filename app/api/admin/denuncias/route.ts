import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

async function requireAdmin(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!["PENDENTE", "ANALISADO", "REJEITADO"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Denúncia não encontrada." }, { status: 404 });

  await prisma.report.update({
    where: { id },
    data: { status: status as "PENDENTE" | "ANALISADO" | "REJEITADO", handledBy: session.user.id, handledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
