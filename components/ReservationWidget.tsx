"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ReservationWidget({
  listingId,
  listingTitle,
  price,
}: {
  listingId: string;
  listingTitle: string;
  price: string;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function validateDates(): boolean {
    if (!startDate || !endDate) {
      setMessage({ type: "error", text: "Selecione as datas de início e fim." });
      return false;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setMessage({ type: "error", text: "A data de fim deve ser posterior à data de início." });
      return false;
    }
    if (new Date(startDate) < new Date(new Date().toDateString())) {
      setMessage({ type: "error", text: "A data de início não pode estar no passado." });
      return false;
    }
    return true;
  }

  async function submit() {
    setMessage(null);
    if (!session) {
      router.push(`/entrar?redirect=${encodeURIComponent(`/anuncio/${listingId}`)}`);
      return;
    }
    if (!validateDates()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar a reserva.");
      setMessage({
        type: "ok",
        text: "Pedido de reserva enviado! Acompanhe em ",
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao criar reserva." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700">
        Reservar períodos de aluguer
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-500">Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500">Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
      >
        {loading ? "A verificar disponibilidade..." : "Pedir reserva"}
      </button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
          {message.type === "ok" && (
            <button onClick={() => router.push("/conta/reservas")} className="font-medium underline">
              ver as minhas reservas
            </button>
          )}
        </p>
      )}
    </div>
  );
}
