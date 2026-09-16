"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BannerAdminControls({
  bannerId,
  status,
}: {
  bannerId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  async function act(action: string) {
    setLoading(action);
    try {
      const res = await fetch("/api/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bannerId, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro.");
      }
      router.refresh();
    } catch (e) {
      /* ignore */
    } finally {
      setLoading("");
    }
  }

  const isActive = status === "ATIVO";

  return (
    <button
      onClick={() => act(isActive ? "PAUSAR" : "REATIVAR")}
      disabled={!!loading}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
    >
      {loading ? "..." : isActive ? "Pausar" : "Reativar"}
    </button>
  );
}