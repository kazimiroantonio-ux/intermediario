import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { PRICING } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const position = url.searchParams.get("position");

  const where = position ? { position: position as "HERO" | "HOME_MID" | "LISTING_TOP", status: "ATIVO" as const } : { status: "ATIVO" as const };

  const banners = await prisma.banner.findMany({
    where: { ...where, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ banners });
}

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const rl = rateLimit(`banners:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { title?: string; imageUrl?: string; linkUrl?: string; position?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();
  const linkUrl = String(body.linkUrl ?? "").trim();
  const position = String(body.position ?? "");

  if (!title || !imageUrl || !linkUrl) {
    return NextResponse.json({ error: "Preencha título, imagem e link." }, { status: 400 });
  }
  if (!["HERO", "HOME_MID", "LISTING_TOP"].includes(position)) {
    return NextResponse.json({ error: "Posição inválida." }, { status: 400 });
  }

  const price = PRICING.BANNER[position as "HERO" | "HOME_MID" | "LISTING_TOP"];
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const result = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: "BANNER",
        amount: price,
        status: "PAID",
        reference: `BAN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: `Banner patrocinado (${position}) — 1 semana`,
      },
    });

    const banner = await tx.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        position: position as "HERO" | "HOME_MID" | "LISTING_TOP",
        startDate,
        endDate,
        advertiserId: session.user.id,
        status: "ATIVO",
      },
    });

    return { txn, banner };
  });

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  let id: string, action: string;
  try {
    const body = await request.json();
    id = String(body.id ?? "");
    action = String(body.action ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: "Banner não encontrado." }, { status: 404 });

  const isOwner = banner.advertiserId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (action === "PAUSAR" || action === "REATIVAR") {
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    const newStatus = action === "PAUSAR" ? "PAUSADO" : "ATIVO";
    await prisma.banner.update({ where: { id }, data: { status: newStatus } });
    return NextResponse.json({ ok: true });
  }

  if (action === "CLIQUE") {
    await prisma.banner.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}