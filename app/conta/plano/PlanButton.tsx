"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKwanza } from "@/lib/utils";

export function PlanButton({
  planId,
  planName,
  price,
  disabled,
}: {
  planId: string;
  planName: string;
  price: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "PLANO", planoId: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro no pagamento.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={loading || disabled}
        className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading
          ? "A processar..."
          : price === 0
            ? "Plano atual"
            : `Assinar por ${formatKwanza(price)}/mês`}
      </button>
      {price > 0 && !loading && (
        <p className="mt-2 text-center text-xs text-zinc-400">Pagamento via Multicaixa Express</p>
      )}
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
