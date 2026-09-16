"use client";

// ---------------------------------------------------------------------------
// Hook mínimo de fetch para o painel do agente: expõe loading/erro/dados e
// recarga. Padrão assume respostas JSON { error?: string } em falhas.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setData(null);
        setError(body?.error ?? `Erro ${res.status}. Tente novamente.`);
      } else {
        setData(body as T);
      }
    } catch {
      setError("Falha de ligação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setError(body?.error ?? `Erro ${res.status}. Tente novamente.`);
        } else {
          setData(body as T);
        }
      } catch {
        if (cancelled) return;
        setError("Falha de ligação. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, error, loading, reload };
}