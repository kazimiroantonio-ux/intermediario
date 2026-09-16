import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { createNotification } from "@/lib/notify";
import { COMMISSION_RATE, COMMISSION_MIN } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const { id } = await params;

  let action: string;
  try {
    const body = await request.json();
    action = String(body.action ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!["CONFIRMAR", "REJEITAR", "CANCELAR"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, userId: true, title: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json({ error: "Esta reserva já foi processada." }, { status: 400 });
  }

  const isSeller = reservation.listing.userId === session.user.id;
  const isBuyer = reservation.buyerId === session.user.id;

  if (action === "CONFIRMAR" && !isSeller) {
    return NextResponse.json({ error: "Só o vendedor pode confirmar." }, { status: 403 });
  }
  if (action === "REJEITAR" && !isSeller) {
    return NextResponse.json({ error: "Só o vendedor pode rejeitar." }, { status: 403 });
  }
  if (action === "CANCELAR" && !isBuyer && !isSeller) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  if (action === "CONFIRMAR") {
    const rawCommission = reservation.totalPrice.mul(COMMISSION_RATE);
    const isMinimum = rawCommission.lt(COMMISSION_MIN);
    const appliedCommission = isMinimum ? COMMISSION_MIN : rawCommission;

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          commission: appliedCommission,
          commissionPaid: true,
        },
      }),
      prisma.commissionLedger.create({
        data: {
          userId: reservation.listing.userId,
          reservationId: reservation.id,
          amount: appliedCommission,
          status: "PAGA",
        },
      }),
      prisma.transaction.create({
        data: {
          userId: reservation.listing.userId,
          listingId: reservation.listing.id,
          type: "COMISSAO",
          amount: appliedCommission,
          status: "PAID",
          reference: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          description: isMinimum
            ? `Comissão mínima da reserva "${reservation.listing.title}"`
            : `Comissão (10%) da reserva "${reservation.listing.title}"`,
        },
      }),
    ]);

    await createNotification(prisma, {
      userId: reservation.buyerId,
      type: "RESERVA",
      title: "Reserva confirmada",
      content: `O vendedor confirmou a sua reserva no anúncio "${reservation.listing.title}".`,
      link: "/conta/reservas",
    });

    return NextResponse.json({ reservation: updated }, { status: 200 });
  }

  const newStatus = action === "REJEITAR" ? "REJECTED" : "CANCELLED";

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: newStatus },
  });

  const notifyUserId =
    action === "REJEITAR" ? reservation.buyerId : reservation.listing.userId;
  const notifyTitle = action === "REJEITAR" ? "Reserva rejeitada" : "Reserva cancelada";
  const notifyContent =
    action === "REJEITAR"
      ? `O vendedor rejeitou a sua reserva em "${reservation.listing.title}".`
      : `O comprador cancelou a reserva em "${reservation.listing.title}".`;

  await createNotification(prisma, {
    userId: notifyUserId,
    type: "RESERVA",
    title: notifyTitle,
    content: notifyContent,
    link: "/conta/reservas",
  });

  return NextResponse.json({ reservation: updated }, { status: 200 });
}