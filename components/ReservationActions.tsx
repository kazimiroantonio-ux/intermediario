"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReservationActions({
  reservationId,
  status,
  isSeller,
}: {
  reservationId: string;
  status: string;
  isSeller: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function act(action: string) {
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/reservas/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar a reserva.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar a reserva.");
    } finally {
      setLoading("");
    }
  }

  if (status !== "PENDING") return null;

  return (
    <div className="shrink-0 space-y-1">
      {isSeller && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => act("CONFIRMAR")}
            disabled={!!loading}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading === "CONFIRMAR" ? "A processar..." : "✓ Confirmar"}
          </button>
          <button
            onClick={() => act("REJEITAR")}
            disabled={!!loading}
            className="rounded-lg border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            {loading === "REJEITAR" ? "A processar..." : "✕ Rejeitar"}
          </button>
        </div>
      )}
      {!isSeller && (
        <button
          onClick={() => act("CANCELAR")}
          disabled={!!loading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading === "CANCELAR" ? "A processar..." : "Cancelar pedido"}
        </button>
      )}
      {error && <p className="max-w-[180px] text-xs text-red-600">{error}</p>}
    </div>
  );
}