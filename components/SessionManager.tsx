"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SessionView {
  id: string;
  device: string;
  browser: string;
  os: string;
  mobile: boolean;
  ip: string;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

const fmt = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("pt-AO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function SessionManager({ sessions }: { sessions: SessionView[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const othersCount = sessions.filter((s) => !s.isCurrent).length;

  async function revoke(payload: { id?: string; all?: boolean }) {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/sessoes/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível terminar a sessão.");
      setMessage("Sessão(ões) terminada(s) com sucesso.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao terminar a sessão.");
    } finally {
      setBusyId(null);
      setRevokingAll(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sessões e dispositivos</h2>
          <p className="text-sm text-zinc-500">
            Termine remotamente sessões que não reconhece.
          </p>
        </div>
        <button
          type="button"
          disabled={revokingAll || othersCount === 0}
          onClick={() => {
            setRevokingAll(true);
            revoke({ all: true });
          }}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Terminar todas as outras
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Sem sessões ativas.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-zinc-900">{s.device}</p>
                  {s.isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Esta sessão
                    </span>
                  )}
                </div>
                <dl className="mt-1 grid gap-x-6 gap-y-0.5 text-xs text-zinc-500 sm:grid-cols-2">
                  <div>
                    <dt className="inline text-zinc-400">IP: </dt>
                    <dd className="inline">{s.ip || s.location}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-400">Localização: </dt>
                    <dd className="inline">{s.location}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-400">Último acesso: </dt>
                    <dd className="inline">{fmt(s.lastActive)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-400">Criada: </dt>
                    <dd className="inline">{fmt(s.createdAt)}</dd>
                  </div>
                </dl>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => {
                    setBusyId(s.id);
                    revoke({ id: s.id });
                  }}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyId === s.id ? "A terminar…" : "Terminar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}