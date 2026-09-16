"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
  MENSAGEM: "💬",
  RESERVA: "📅",
  ANUNCIO_APROVADO: "✅",
  ANUNCIO_REJEITADO: "❌",
};

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notificacoes");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function markAllRead() {
    await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar notificações...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Notificações</h1>
        <button
          onClick={markAllRead}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Marcar todas como lidas
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Sem notificações</p>
          <p className="mt-2 text-sm text-zinc-500">
            As novidades sobre mensagens, reservas e anúncios aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link ?? "#"}
                onClick={() => {
                  fetch("/api/notificacoes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: n.id }),
                  });
                }}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                  n.readAt ? "border-zinc-200 bg-white" : "border-emerald-200 bg-emerald-50/60"
                }`}
              >
                <span className="text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.readAt ? "font-medium text-zinc-900" : "font-semibold text-zinc-900"}`}>
                    {n.title}
                    {!n.readAt && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />}
                  </p>
                  {n.content && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{n.content}</p>}
                  <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
