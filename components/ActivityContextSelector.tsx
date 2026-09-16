"use client";

import { useEffect, useState } from "react";

type Side = "ALL" | "BUYER" | "SELLER";

interface Activity {
  id: string;
  activityType: string;
  side: string;
  status: string;
  transactionId?: string | null;
  listingId?: string | null;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  BUYING: "Compra",
  SELLING: "Venda",
  VISITING: "Visita",
  INVESTIGATING: "Investigação",
};

export function ActivityContextSelector() {
  const [side, setSide] = useState<Side>("ALL");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/activities?side=${side}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setActivities(data.activities ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [side]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">As suas atividades</h2>
        <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-sm">
          {(
            [
              ["ALL", "Todas as atividades"],
              ["BUYER", "Como comprador"],
              ["SELLER", "Como vendedor"],
            ] as [Side, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSide(value)}
              aria-pressed={side === value}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                side === value
                  ? "bg-emerald-700 text-white"
                  : "text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-zinc-500">A carregar…</p>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-zinc-500">
              Sem atividades neste contexto ainda.
            </p>
            <div className="flex gap-3 text-sm">
              <a href="/listar" className="font-medium text-emerald-700 hover:underline">
                Encontrar um imóvel
              </a>
              <a href="/conta/anuncios/novo" className="font-medium text-emerald-700 hover:underline">
                Publicar um imóvel
              </a>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      a.side === "SELLER"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {a.side === "SELLER" ? "Vendedor" : "Comprador"}
                  </span>
                  <span className="text-sm font-medium text-zinc-800">
                    {LABELS[a.activityType] ?? a.activityType}
                  </span>
                </div>
                <time className="text-xs text-zinc-400">
                  {new Date(a.createdAt).toLocaleDateString("pt-AO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}