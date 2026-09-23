import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitChatEvent, sanitizeMessage, EVENT_MESSAGE_NEW, EVENT_UNREAD_NOTIFICATION } from "@/lib/realtime";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { chatRoomId?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const chatRoomId = sanitizeMessage(body.chatRoomId, 64);
  const content = sanitizeMessage(body.content);
  if (!chatRoomId || !content) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }

  const chatRoom = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    select: { buyerId: true, sellerId: true },
  });
  if (!chatRoom) {
    return NextResponse.json({ error: "Sala de conversa não encontrada." }, { status: 404 });
  }
  if (chatRoom.buyerId !== session.user.id && chatRoom.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: { chatRoomId, senderId: session.user.id, content },
    include: { sender: { select: { id: true, name: true } } },
  });

  await emitChatEvent(chatRoomId, EVENT_MESSAGE_NEW, { message, chatRoomId });

  const recipients = [chatRoom.buyerId, chatRoom.sellerId];
  for (const uid of recipients) {
    if (uid !== session.user.id) {
      await emitChatEvent(chatRoomId, EVENT_UNREAD_NOTIFICATION, {
        chatRoomId,
        messageId: message.id,
        senderId: session.user.id,
      });
      try {
        await prisma.notification.create({
          data: {
            userId: uid,
            type: "MENSAGEM",
            title: "Nova mensagem",
            content: content.slice(0, 120),
            link: `/mensagens?c=${chatRoomId}`,
          },
        });
      } catch {}
    }
  }

  return NextResponse.json({ message });
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const chatRooms = await prisma.chatRoom.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
    },
    include: {
      listing: { select: { id: true, title: true, images: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: session.user.id }, isRead: false },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ chatRooms });
}
