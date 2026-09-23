import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitChatEvent, EVENT_MESSAGE_READ } from "@/lib/realtime";

export async function PATCH(
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

  await prisma.message.updateMany({
    where: { chatRoomId: id, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  });

  await emitChatEvent(id, EVENT_MESSAGE_READ, { chatRoomId: id, userId: session.user.id });

  return NextResponse.json({ ok: true });
}