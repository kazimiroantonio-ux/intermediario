import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { createNotification } from "@/lib/notify";

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

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });

  if (action === "aprovar") {
    await prisma.listing.update({ where: { id }, data: { status: "ACTIVE", publishedAt: listing.publishedAt ?? new Date() } });
    await createNotification(prisma, {
      userId: listing.userId,
      type: "ANUNCIO_APROVADO",
      title: "Anúncio aprovado",
      content: `O seu anúncio "${listing.title}" foi aprovado e já está visível.`,
      link: `/anuncio/${listing.id}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "rejeitar") {
    await prisma.listing.update({ where: { id }, data: { status: "REJECTED" } });
    await createNotification(prisma, {
      userId: listing.userId,
      type: "ANUNCIO_REJEITADO",
      title: "Anúncio rejeitado",
      content: `O seu anúncio "${listing.title}" não cumpriu as regras da plataforma.`,
      link: "/conta/anuncios",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "destacar") {
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + 30);
    await prisma.listing.update({ where: { id }, data: { isFeatured: true, featuredUntil } });
    return NextResponse.json({ ok: true });
  }

  if (action === "removerDestaque") {
    await prisma.listing.update({ where: { id }, data: { isFeatured: false, featuredUntil: null } });
    return NextResponse.json({ ok: true });
  }

  if (action === "remover") {
    await prisma.listing.update({ where: { id }, data: { status: "BLOCKED" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
