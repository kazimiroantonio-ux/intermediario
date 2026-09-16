"use client";

import { useState } from "react";

const REASONS = [
  { value: "SPAM", label: "Spam ou anúncio duplicado" },
  { value: "FRAUDE", label: "Suspeita de fraude/golpe" },
  { value: "CONTEUDO_INAPROPRIADO", label: "Conteúdo inapropriado" },
  { value: "PREÇO_ENGANOSO", label: "Preço enganoso" },
  { value: "PRODUTO_ILEGAL", label: "Produto ilegal" },
  { value: "OUTRO", label: "Outro motivo" },
];

export function ReportDialog({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/denuncias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, category: reason, details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar denúncia.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar denúncia.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-zinc-400 underline hover:text-red-500"
      >
        Denunciar anúncio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-zinc-900">Denunciar anúncio</h2>
            {done ? (
              <div className="mt-4">
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  Denúncia enviada. A nossa equipa de moderação vai analisar. Obrigado por manter a plataforma segura.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Motivo</label>
                  <select
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecionar...</option>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Detalhes (opcional)</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Descreva o problema..."
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !reason}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {sending ? "A enviar..." : "Denunciar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
