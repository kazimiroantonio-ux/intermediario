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

  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const action = String(body.action ?? "");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });

  if (action === "verificar") {
    await prisma.user.update({ where: { id }, data: { isVerified: true } });
    return NextResponse.json({ ok: true });
  }
  if (action === "desverificar") {
    await prisma.user.update({ where: { id }, data: { isVerified: false } });
    return NextResponse.json({ ok: true });
  }
  if (action === "promoverAdmin") {
    if (user.role === "ADMIN") return NextResponse.json({ error: "Ação inválida para este utilizador." }, { status: 400 });
    await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
