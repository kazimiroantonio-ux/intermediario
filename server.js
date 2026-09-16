require("dotenv").config();
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function sanitizeMessage(raw, max = 4000) {
  return String(raw ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => handle(req, res));

    const io = new Server(server, {
      path: "/api/socket",
      cors: { origin: true, methods: ["GET", "POST"] },
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6,
    });

    io.use(async (socket, nextMiddleware) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return nextMiddleware(new Error("Não autenticado."));

        const session = await prisma.session.findUnique({
          where: { token },
          select: { expiresAt: true, user: { select: { id: true, emailVerified: true } } },
        });

        if (!session || session.expiresAt <= new Date()) {
          return nextMiddleware(new Error("Sessão inválida ou expirada."));
        }

        socket.data.userId = session.user.id;
        socket.data.emailVerified = session.user.emailVerified;
        return nextMiddleware();
      } catch {
        return nextMiddleware(new Error("Falha na autenticação."));
      }
    });

    io.on("connection", (socket) => {
      const userId = socket.data.userId;

      socket.join(`user:${userId}`);

      socket.on("typing_start", (payload) => {
        const chatRoomId = sanitizeMessage(payload?.chatRoomId, 64);
        if (!chatRoomId) return;
        socket.to(`room:${chatRoomId}`).emit("recipient_typing", {
          chatRoomId,
          userId,
          isTyping: true,
        });
      });

      socket.on("typing_stop", (payload) => {
        const chatRoomId = sanitizeMessage(payload?.chatRoomId, 64);
        if (!chatRoomId) return;
        socket.to(`room:${chatRoomId}`).emit("recipient_typing", {
          chatRoomId,
          userId,
          isTyping: false,
        });
      });

      socket.on("message:send", async (payload, ack) => {
        try {
          if (!socket.data.emailVerified) {
            ack?.({ error: "Verifique o seu email para enviar mensagens." });
            return;
          }

          const chatRoomId = sanitizeMessage(payload?.chatRoomId, 64);
          const content = sanitizeMessage(payload?.content);

          if (!chatRoomId || !content) {
            ack?.({ error: "Dados em falta." });
            return;
          }
          if (content.length === 0) {
            ack?.({ error: "Mensagem vazia após sanitização." });
            return;
          }

          const chatRoom = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            select: { buyerId: true, sellerId: true },
          });

          if (!chatRoom) {
            ack?.({ error: "Sala de conversa não encontrada." });
            return;
          }
          if (chatRoom.buyerId !== userId && chatRoom.sellerId !== userId) {
            ack?.({ error: "Sem permissão." });
            return;
          }

          const message = await prisma.message.create({
            data: { chatRoomId, senderId: userId, content },
            include: {
              sender: { select: { id: true, name: true } },
            },
          });

          socket.join(`room:${chatRoomId}`);

          const recipients = [chatRoom.buyerId, chatRoom.sellerId];
          for (const uid of recipients) {
            io.to(`user:${uid}`).emit("message:new", {
              message,
              chatRoomId,
            });

            if (uid !== userId) {
              io.to(`user:${uid}`).emit("unread_notification", {
                chatRoomId,
                messageId: message.id,
                senderId: userId,
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

          ack?.({ ok: true, message });
        } catch {
          ack?.({ error: "Erro ao enviar mensagem." });
        }
      });

      socket.on("message:read", async (payload) => {
        try {
          const chatRoomId = String(payload?.chatRoomId ?? "");
          if (!chatRoomId) return;

          const chatRoom = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            select: { buyerId: true, sellerId: true },
          });
          if (!chatRoom) return;
          if (chatRoom.buyerId !== userId && chatRoom.sellerId !== userId) return;

          await prisma.message.updateMany({
            where: {
              chatRoomId,
              senderId: { not: userId },
              isRead: false,
            },
            data: { isRead: true },
          });
          io.to(`user:${userId}`).emit("messages:read", { chatRoomId });
        } catch {}
      });

      socket.on("disconnect", () => {
        io.emit("recipient_typing", { userId, isTyping: false });
      });
    });

    server.listen(port, () => {
      console.log(`> Pronto em http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
