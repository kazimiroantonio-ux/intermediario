import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const chatRoom = await prisma.chatRoom.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true },
  });
  if (!chatRoom) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (chatRoom.buyerId !== session.user.id && chatRoom.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { chatRoomId: id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}
