"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "numero" | "codigo";

export default function TelefonePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("numero");
  const [numero, setNumero] = useState("");
  const [codigo, setCodigo] = useState("");
  const [devCode, setDevCode] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/telefone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "request", numero }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível enviar o código.");
      return;
    }
    if (data.devCode) setDevCode(String(data.devCode));
    setStep("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/telefone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", numero, codigo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Código inválido ou expirado.");
      return;
    }
    router.push("/conta");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-2xl text-white">
          📱
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Entrar com telemóvel</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Recebe um código por SMS e entra sem palavra-passe. Novo número? A conta é
          criada automaticamente.
        </p>

        {step === "numero" ? (
          <form onSubmit={pedirCodigo} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Número de telemóvel
              </label>
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="+244 923 456 789"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "A enviar código..." : "Enviar código por SMS"}
            </button>
          </form>
        ) : (
          <form onSubmit={verificar} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Código de 6 dígitos
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none focus:border-emerald-600"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Enviado para <span className="font-medium">{numero}</span>.
              </p>
            </div>
            {devCode && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">Modo desenvolvimento</p>
                <p className="mt-1">
                  KambaSMS não configurada — o código para testes é:{" "}
                  <span className="font-mono text-base font-bold">{devCode}</span>
                </p>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "A verificar..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("numero")}
              className="w-full text-center text-sm text-zinc-500 hover:underline"
            >
              Alterar número
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Prefere usar email?{" "}
          <Link href="/entrar" className="font-medium text-emerald-700 hover:underline">
            Iniciar sessão
          </Link>
        </p>
      </div>
    </div>
  );
}