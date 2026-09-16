import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { createNotification } from "@/lib/notify";
import { PRICING } from "@/lib/utils";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const rl = rateLimit(`flash:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { listingId?: string; title?: string; targetProvince?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const listingId = String(body.listingId ?? "");
  const title = String(body.title ?? "").trim();
  const targetProvince = body.targetProvince ? String(body.targetProvince) : null;

  if (!listingId || !title) {
    return NextResponse.json({ error: "Selecione o anúncio e escreva o título da promoção." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Anúncio não encontrado ou inativo." }, { status: 404 });
  }
  if (listing.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão para promover este anúncio." }, { status: 403 });
  }

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const recent = await prisma.flashPromotion.findFirst({
    where: { advertiserId: session.user.id, createdAt: { gte: lastWeek } },
  });
  if (recent) {
    return NextResponse.json({ error: "Limite de 1 promoção flash por semana." }, { status: 429 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        userId: session.user.id,
        listingId,
        type: "FLASH",
        amount: PRICING.FLASH,
        status: "PAID",
        reference: `FLASH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: `Promoção flash: ${title}`,
      },
    });

    const promo = await tx.flashPromotion.create({
      data: {
        listingId,
        advertiserId: session.user.id,
        title,
        targetProvince,
        status: "ENVIADA",
      },
    });

    return { txn, promo };
  });

  const targets = await prisma.user.findMany({
    where: {
      ...(targetProvince ? { province: targetProvince } : {}),
      id: { not: session.user.id },
    },
    select: { id: true },
    take: 1000,
  });

  await Promise.all(
    targets.map((u) =>
      createNotification(prisma, {
        userId: u.id,
        type: "FLASH",
        title: "⚡ " + title,
        content: `Oferta relâmpago! Veja em "${listing.title}".`,
        link: `/anuncio/${listingId}`,
      })
    )
  );

  await prisma.flashPromotion.update({
    where: { id: result.promo.id },
    data: { sentCount: targets.length },
  });

  return NextResponse.json({ ...result, sentCount: targets.length }, { status: 201 });
}