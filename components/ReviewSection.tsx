"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

export function ReviewSection({
  sellerId,
  sellerName,
  reviews,
  average,
  total,
}: {
  sellerId: string;
  sellerName: string;
  reviews: Review[];
  average: number | null;
  total: number;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Selecione uma classificação de 1 a 5 estrelas.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar avaliação.");
      setDone(true);
      setComment("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Avaliações de {sellerName.split(" ")[0]}</h2>
        <div className="text-sm text-zinc-500">
          {average !== null ? (
            <span>
              <span className="font-bold text-amber-500">★ {average}</span> · {total} avaliaçõ{total === 1 ? "es" : "es"}
            </span>
          ) : (
            <span>Sem avaliações</span>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reviews.slice(0, 5).map((r) => (
            <li key={r.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-900">{r.author.name}</p>
                <span className="text-xs text-amber-500">{"★".repeat(r.rating)}</span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-zinc-600">{r.comment}</p>}
              <p className="mt-1 text-xs text-zinc-400">{timeAgo(r.createdAt)}</p>
            </li>
          ))}
          {reviews.length > 5 && (
            <li className="text-center text-sm text-zinc-500">e mais {reviews.length - 5} avaliações</li>
          )}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-700">Deixe a sua avaliação</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} estrelas`}
              className={`text-xl transition-transform hover:scale-110 ${n <= rating ? "text-amber-400" : "text-zinc-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Como foi a experiência com este vendedor?"
          maxLength={500}
          className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {done && !error && <p className="mt-2 text-sm text-emerald-600">Avaliação registada. Obrigado!</p>}
        <button
          type="submit"
          disabled={sending || rating < 1}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {sending ? "A enviar..." : "Enviar avaliação"}
        </button>
      </form>
    </div>
  );
}
