import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { createNotification } from "@/lib/notify";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão para reservar." }, { status: 401 });
  }

  let listingId: string, startDate: string, endDate: string;
  try {
    const body = await request.json();
    listingId = String(body.listingId ?? "");
    startDate = String(body.startDate ?? "");
    endDate = String(body.endDate ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!listingId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Datas inválidas." }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "A data de fim deve ser posterior à de início." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      userId: true,
      dealType: true,
      status: true,
      price: true,
      title: true,
    },
  });

  if (!listing || listing.status === "BLOCKED") {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }
  if (listing.dealType !== "ALUGUER") {
    return NextResponse.json({ error: "Este anúncio não está disponível para aluguer." }, { status: 400 });
  }
  if (listing.userId === session.user.id) {
    return NextResponse.json({ error: "Não pode reservar o seu próprio anúncio." }, { status: 400 });
  }

  const conflict = await prisma.reservation.findFirst({
    where: {
      listingId,
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [
        { startDate: { lt: end } },
        { endDate: { gt: start } },
      ],
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "As datas selecionadas não estão disponíveis. Escolha outro período." },
      { status: 409 }
    );
  }

  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const totalPrice = listing.price.mul(days);

  const reservation = await prisma.reservation.create({
    data: {
      listingId,
      buyerId: session.user.id,
      startDate: start,
      endDate: end,
      totalPrice,
    },
  });

  await createNotification(prisma, {
    userId: listing.userId,
    type: "RESERVA",
    title: "Nova reserva recebida",
    content: `${session.user.name} solicitou uma reserva no seu anúncio "${listing.title}".`,
    link: "/conta/reservas",
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
