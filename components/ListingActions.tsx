"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ListingActions({ listingId, status }: { listingId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function action(type: "submeter" | "publicar" | "pausar" | "remover") {
    setBusy(type);
    try {
      const res = await fetch(`/api/anuncios/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Erro ao atualizar o anúncio.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(status === "DRAFT" || status === "REJECTED") && (
        <button
          onClick={() => action("submeter")}
          disabled={busy !== null}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {busy === "submeter" ? "..." : "Submeter para verificação"}
        </button>
      )}
      {status === "VERIFIED" && (
        <button
          onClick={() => action("publicar")}
          disabled={busy !== null}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "publicar" ? "..." : "Publicar"}
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          onClick={() => action("pausar")}
          disabled={busy !== null}
          className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-300 disabled:opacity-50"
        >
          {busy === "pausar" ? "..." : "Pausar"}
        </button>
      )}
      <button
        onClick={() => {
          if (confirm("Remover este anúncio?")) action("remover");
        }}
        disabled={busy !== null}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        {busy === "remover" ? "..." : "Remover"}
      </button>
    </div>
  );
}
