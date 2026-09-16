"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerificationReview({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function act(action: string) {
    setLoading(action);
    setError("");
    try {
      const res = await fetch("/api/admin/verificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar o pedido.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar o pedido.");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <button
          onClick={() => act("APROVAR")}
          disabled={!!loading}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading === "APROVAR" ? "..." : "Aprovar"}
        </button>
        <button
          onClick={() => act("REJEITAR")}
          disabled={!!loading}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          {loading === "REJEITAR" ? "..." : "Rejeitar"}
        </button>
      </div>
      {error && <p className="max-w-[160px] text-xs text-red-600">{error}</p>}
    </div>
  );
}