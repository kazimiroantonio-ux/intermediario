import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão para contactar o vendedor." }, { status: 401 });
  }

  let listingId: string;
  try {
    const body = await request.json();
    listingId = String(body.listingId ?? "");
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!listingId) {
    return NextResponse.json({ error: "Anúncio em falta." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, status: true },
  });

  if (!listing || listing.status === "BLOCKED") {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }

  if (listing.userId === session.user.id) {
    return NextResponse.json({ error: "Este é o seu próprio anúncio." }, { status: 400 });
  }

  const chatRoom = await prisma.chatRoom.upsert({
    where: {
      listingId_buyerId_sellerId: {
        listingId,
        buyerId: session.user.id,
        sellerId: listing.userId,
      },
    },
    update: {},
    create: {
      listingId,
      buyerId: session.user.id,
      sellerId: listing.userId,
    },
  });

  return NextResponse.json({ chatRoomId: chatRoom.id });
}
