"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { getSocket } from "@/lib/socket-client";
import { authClient } from "@/lib/auth-client";

type Message = {
  id: string;
  content: string;
  isRead: boolean;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
};

type ChatRoom = {
  id: string;
  listing: { id: string; title: string; images: string[] };
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  messages: Message[];
  _count: { messages: number };
};

function ChatApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeId, setActiveId] = useState<string>(searchParams.get("c") ?? "");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const myId = session?.user.id;

  function otherParty(room: ChatRoom) {
    return room.buyer.id === myId ? room.seller : room.buyer;
  }

  const refreshChatRooms = useCallback(async () => {
    const res = await fetch("/api/mensagens");
    if (res.ok) {
      const data = await res.json();
      setChatRooms(data.conversations);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/mensagens/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => ({ ...prev, [id]: data.messages }));
    }
  }, []);

  useEffect(() => {
    if (myId) refreshChatRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  useEffect(() => {
    if (!activeId || !myId) return;
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myId]);

  useEffect(() => {
    let cancelled = false;
    async function connect() {
      if (!myId) return;
      const socket = await getSocket();
      if (cancelled) return;

      const onNew = ({ message, chatRoomId }: { message: Message; chatRoomId: string }) => {
        setMessages((prev) => {
          const list = prev[chatRoomId] ?? [];
          if (list.some((m) => m.id === message.id)) return prev;
          return { ...prev, [chatRoomId]: [...list, message] };
        });
        refreshChatRooms();
      };
      const onRead = () => {
        refreshChatRooms();
      };
      const onTyping = ({ chatRoomId, userId }: { chatRoomId: string; userId: string }) => {
        // Handle recipient typing indicator if needed
      };
      const onUnreadNotification = () => {
        refreshChatRooms();
      };

      const onReconnect = () => {
        setConnected(true);
        refreshChatRooms();
        if (activeIdRef.current) {
          loadMessages(activeIdRef.current);
          socket.emit("message:read", { chatRoomId: activeIdRef.current });
        }
      };
      const onDisconnect = () => setConnected(false);

      socket.on("message:new", onNew);
      socket.on("messages:read", onRead);
      socket.on("recipient_typing", onTyping);
      socket.on("unread_notification", onUnreadNotification);
      socket.on("connect", onReconnect);
      socket.on("disconnect", onDisconnect);

      setConnected(socket.connected);

      if (activeIdRef.current) {
        socket.emit("message:read", { chatRoomId: activeIdRef.current });
      }

      cleanupRef.current = () => {
        socket.off("message:new", onNew);
        socket.off("messages:read", onRead);
        socket.off("recipient_typing", onTyping);
        socket.off("unread_notification", onUnreadNotification);
        socket.off("connect", onReconnect);
        socket.off("disconnect", onDisconnect);
      };
    }
    connect();
    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages[activeId]]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId) return;
    setInput("");
    const socket = await getSocket();
    socket.emit("message:send", { chatRoomId: activeId, content }, (res: { error?: string } | null) => {
      if (res?.error) {
        setInput(content);
        alert(res.error);
      }
    });
  }

  if (isPending) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-zinc-500">A carregar...</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-lg font-medium text-zinc-700">Inicie sessão para aceder às mensagens.</p>
        <Link href="/entrar" className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white">
          Entrar / Registar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col px-4 py-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-3">
        <div className={`${activeId ? "hidden lg:block" : "block"} border-r border-zinc-200 lg:col-span-1`}>
          <div className="border-b border-zinc-200 px-4 py-3">
            <h1 className="text-lg font-bold text-zinc-900">Mensagens</h1>
          </div>
          <div className="max-h-full overflow-y-auto">
            {chatRooms.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">Sem conversas ainda.</p>
            ) : (
              chatRooms.map((room) => {
                const other = otherParty(room);
                const active = room.id === activeId;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveId(room.id);
                      router.replace(`/mensagens?c=${room.id}`);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors ${active ? "bg-emerald-50" : "hover:bg-zinc-50"}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {other.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{other.name}</p>
                      <p className="truncate text-xs text-zinc-500">{room.listing.title}</p>
                      {room.messages[0] && (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {room.messages[0].sender.id === myId ? "Você: " : ""}{room.messages[0].content}
                        </p>
                      )}
                    </div>
                    {room._count.messages > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                        {room._count.messages}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`${activeId ? "flex" : "hidden lg:flex"} min-h-0 flex-col lg:col-span-2`}>
          {activeId ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
                <button
                  onClick={() => router.replace("/mensagens")}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 lg:hidden"
                  aria-label="Voltar"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {chatRooms.find((c) => c.id === activeId)?.listing.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    Com {chatRooms.find((c) => c.id === activeId) ? otherParty(chatRooms.find((c) => c.id === activeId)!).name : ""}
                    {" · "}
                    {connected ? (
                      <span className="font-medium text-emerald-600">● ligado</span>
                    ) : (
                      <span className="font-medium text-amber-600">○ a reconectar…</span>
                    )}
                  </p>
                </div>
              </div>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {(messages[activeId] ?? []).map((m) => {
                  const mine = m.senderId === myId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          mine ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        {!mine && <p className="mb-0.5 text-[11px] font-semibold text-emerald-700">{m.sender.name}</p>}
                        <p className="whitespace-pre-line break-words">{m.content}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-emerald-100" : "text-zinc-400"}`}>
                          {new Date(m.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="flex gap-2 border-t border-zinc-200 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="text-5xl">💬</div>
              <p className="mt-4 text-lg font-medium text-zinc-700">Selecione uma conversa</p>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha uma conversa da lista para começar a negociar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MensagensPage() {
  return (
    <Suspense>
      <ChatApp />
    </Suspense>
  );
}
