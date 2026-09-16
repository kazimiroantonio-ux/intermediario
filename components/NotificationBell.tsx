"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function NotificationBell() {
  const { data: session } = authClient.useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session) {
      setUnread(0);
      return;
    }
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/notificacoes");
        if (res.ok) {
          const data = await res.json();
          if (active) setUnread(data.unread ?? 0);
        }
      } catch {}
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [session]);

  if (!session) return null;

  return (
    <Link
      href="/conta/notificacoes"
      className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      aria-label="Notificações"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
