import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export async function PATCH(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  let id: string;
  try {
    const body = await request.json();
    id = String(body.id ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: "Banner não encontrado." }, { status: 404 });

  await prisma.banner.update({ where: { id }, data: { impressions: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}