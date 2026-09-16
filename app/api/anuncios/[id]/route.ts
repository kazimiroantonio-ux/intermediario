import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(`views:${clientIp(request)}`, 30, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ views: null }, { status: 429 });
  }

  const { id } = await params;
  try {
    const listing = await prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return NextResponse.json({ views: listing.views });
  } catch {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  let action: string;
  try {
    const body = await request.json();
    action = String(body.action ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }
  if (listing.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  if (action === "submeter") {
    if (!["DRAFT", "VERIFIED", "REJECTED"].includes(listing.status)) {
      return NextResponse.json({ error: "Este anúncio não pode ser submetido." }, { status: 409 });
    }
    await prisma.listing.update({ where: { id }, data: { status: "PENDING_VERIFICATION", publishedAt: null } });
    return NextResponse.json({ ok: true });
  }

  if (action === "publicar") {
    if (listing.status !== "VERIFIED") {
      return NextResponse.json({ error: "O anúncio precisa de ser verificado antes de publicar." }, { status: 409 });
    }
    await prisma.listing.update({
      where: { id },
      data: { status: "ACTIVE", publishedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "pausar") {
    if (listing.status !== "ACTIVE") {
      return NextResponse.json({ error: "Apenas anúncios publicados podem ser pausados." }, { status: 409 });
    }
    await prisma.listing.update({ where: { id }, data: { status: "VERIFIED", publishedAt: null } });
    return NextResponse.json({ ok: true });
  }

  if (action === "remover") {
    await prisma.listing.update({ where: { id }, data: { status: "BLOCKED" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
