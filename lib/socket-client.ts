import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

function getAuthToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function getSocket(): Promise<Socket> {
  // A instância mantém-se viva: o socket.io reconecta sozinho após falhas,
  // e o token é relido do cookie em cada tentativa (auth dinâmico),
  // evitando sessões órfãs quando a ligação oscila ou o token roda.
  if (socket) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const s = io("/api/socket", {
      auth: (cb) => cb({ token: getAuthToken() }),
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
    await new Promise<void>((resolve) => {
      if (s.connected) return resolve();
      s.once("connect", () => resolve());
      s.once("connect_error", () => resolve());
    });
    socket = s;
    connecting = null;
    return s;
  })();

  return connecting;
}
