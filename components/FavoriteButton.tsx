"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function FavoriteButton({
  listingId,
  initial = false,
  variant = "card",
}: {
  listingId: string;
  initial?: boolean;
  variant?: "card" | "page";
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [active, setActive] = useState(initial);
  const [, startTransition] = useTransition();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push(`/entrar?redirect=${encodeURIComponent(`/anuncio/${listingId}`)}`);
      return;
    }
    const res = await fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.ok) {
      const data = await res.json();
      setActive(data.favorite);
      startTransition(() => router.refresh());
    }
  }

  if (variant === "page") {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
          active
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-red-300 hover:text-red-500"
        }`}
        title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        {active ? "Nos favoritos" : "Favorito"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition-transform hover:scale-110"
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#dc2626" : "none"} stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
