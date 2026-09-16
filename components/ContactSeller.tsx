"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ContactSeller({
  listingId,
  sellerName,
}: {
  listingId: string;
  sellerName: string;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    setError(null);
    if (!session) {
      router.push(`/entrar?redirect=${encodeURIComponent(`/anuncio/${listingId}`)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mensagens/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível iniciar a conversa.");
      router.push(`/mensagens?c=${data.chatRoomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar a conversa.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={startConversation}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {loading ? "A iniciar..." : `Contactar ${sellerName.split(" ")[0]}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
