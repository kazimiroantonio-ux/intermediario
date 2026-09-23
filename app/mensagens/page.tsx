"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { authClient } from "@/lib/auth-client";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  CHANNEL_CHAT,
  CHANNEL_CHAT_TYPING,
  EVENT_MESSAGE_NEW,
  EVENT_MESSAGE_READ,
  EVENT_RECIPIENT_TYPING,
  EVENT_UNREAD_NOTIFICATION,
  type ChatMessagePayload,
} from "@/lib/realtime";

type Message = ChatMessagePayload;

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
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);

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
      setChatRooms(data.chatRooms);
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
    if (myId) {
      refreshChatRooms();
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  useEffect(() => {
    if (!activeId || !myId) return;
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myId]);

  useEffect(() => {
    if (!activeId || !myId) return;

    let cancelled = false;

    const chatChannel = supabaseBrowser.channel(CHANNEL_CHAT(activeId));
    chatChannelRef.current = chatChannel;

    chatChannel
      .on("broadcast", { event: EVENT_MESSAGE_NEW }, ({ payload }) => {
        const { message, chatRoomId } = payload as { message: Message; chatRoomId: string };
        if (chatRoomId !== activeIdRef.current) return;
        setMessages((prev) => {
          const list = prev[chatRoomId] ?? [];
          if (list.some((m) => m.id === message.id)) return prev;
          return { ...prev, [chatRoomId]: [...list, message] };
        });
        refreshChatRooms();
      })
      .on("broadcast", { event: EVENT_MESSAGE_READ }, () => {
        refreshChatRooms();
      })
      .on("broadcast", { event: EVENT_UNREAD_NOTIFICATION }, () => {
        refreshChatRooms();
      })
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setConnected(true);
        }
      });

    const typingChannel = supabaseBrowser.channel(CHANNEL_CHAT_TYPING(activeId));
    typingChannelRef.current = typingChannel;

    typingChannel
      .on("broadcast", { event: EVENT_RECIPIENT_TYPING }, ({ payload }) => {
        const { chatRoomId, userId, isTyping } = payload as {
          chatRoomId: string;
          userId: string;
          isTyping: boolean;
        };
        if (chatRoomId !== activeIdRef.current || userId === myId) return;
        setTyping(isTyping);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabaseBrowser.removeChannel(chatChannel);
      supabaseBrowser.removeChannel(typingChannel);
      chatChannelRef.current = null;
      typingChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages[activeId], typing]);

  const sendRead = useCallback(async () => {
    if (!activeIdRef.current) return;
    const res = await fetch(`/api/mensagens/${activeIdRef.current}/read`, { method: "PATCH" });
    if (res.ok) refreshChatRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId || !myId) return;
    sendRead();
    const interval = setInterval(sendRead, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myId]);

  function emitTyping(isTyping: boolean) {
    const chatRoomId = activeIdRef.current;
    if (!chatRoomId || !myId) return;
    const channel = supabaseBrowser.channel(CHANNEL_CHAT_TYPING(chatRoomId));
    channel
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: EVENT_RECIPIENT_TYPING,
            payload: { chatRoomId, userId: myId, isTyping },
          });
          channel.unsubscribe();
        }
      });
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId) return;
    setInput("");
    emitTyping(false);
    const res = await fetch("/api/mensagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatRoomId: activeId, content }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setInput(content);
      alert(data.error ?? "Erro ao enviar mensagem.");
    }
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
                      <span className="font-medium text-amber-600">○ a ligar…</span>
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
                {typing && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-400">a escrever…</div>
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="flex gap-2 border-t border-zinc-200 p-3">
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (e.target.value && !typing) emitTyping(true);
                    if (!e.target.value) emitTyping(false);
                  }}
                  onBlur={() => emitTyping(false)}
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