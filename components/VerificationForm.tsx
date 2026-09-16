"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerificationForm({
  price,
  companyPrice,
}: {
  price: number;
  companyPrice: number;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"PESSOAL" | "EMPRESA">("PESSOAL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function submit() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verificacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao solicitar a verificação.");
      setMessage({
        type: "ok",
        text: "Pagamento processado (simulado). O seu pedido foi enviado para análise.",
      });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao solicitar a verificação." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-semibold text-zinc-900">Solicitar verificação</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Pagamento simulado via Multicaixa Express. A sua verificação fica ativa após aprovação manual da equipa.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTipo("PESSOAL")}
          className={`rounded-xl border-2 p-4 text-left transition-colors ${
            tipo === "PESSOAL" ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <p className="font-semibold text-zinc-900">Identidade pessoal</p>
          <p className="mt-1 text-sm text-zinc-600">Fixture de identidade (Bilhete de identidade)</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">{price} Kz</p>
        </button>
        <button
          type="button"
          onClick={() => setTipo("EMPRESA")}
          className={`rounded-xl border-2 p-4 text-left transition-colors ${
            tipo === "EMPRESA" ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <p className="font-semibold text-zinc-900">Empresa</p>
          <p className="mt-1 text-sm text-zinc-600">Alvará/Documento comercial</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">{companyPrice} Kz</p>
        </button>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "A processar pagamento..." : `Verificar agora (${tipo === "EMPRESA" ? companyPrice : price} Kz)`}
      </button>

      {message && (
        <p className={`mt-3 text-sm ${message.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}