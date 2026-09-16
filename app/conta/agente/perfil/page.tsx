"use client";

import { useState } from "react";
import { useApi } from "@/components/useApi";
import { Card, ErrorBox, LoadingBox, StatusBadge } from "@/components/agent-ui";
import { AGENT_STATUS_LABEL, BANK_ACCOUNT_STATUS_LABEL } from "@/components/agent-labels";

type RegionLabel = Record<string, string>;

type PerfilData = {
  profile: {
    id: string;
    code: string;
    fullName: string;
    phone: string;
    status: string;
    tier: string;
    commissionShareBps: number;
    payoutMethod: string;
    taxRegime: string;
    bankName: string | null;
    ibanMasked: string | null;
    ratingAvg: number;
    createdAt: string;
  };
  bank: {
    id: string;
    bank: string;
    status: string;
    holderName: string;
  } | null;
};

export default function PerfilPage() {
  const { data, error, loading, reload } = useApi<PerfilData>("/api/agente/perfil");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agente/perfil", {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ phone: phone || undefined, bankName: bankName || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setNotice("Perfil atualizado.");
        await reload();
      } else {
        setNotice(body?.error ?? "Não foi possível atualizar.");
      }
    } catch {
      setNotice("Falha de ligação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBox label="A carregar o perfil..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <LoadingBox label="Perfil indisponível." />;

  const p = data.profile;
  const label = (map: RegionLabel, key: string) => map[key] ?? key;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Dados do agente" icon="👤">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Código</dt>
            <dd className="font-medium text-zinc-900">{p.code}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Nome</dt>
            <dd className="font-medium text-zinc-900">{p.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Estado</dt>
            <dd>
              <StatusBadge status={p.status} label={label(AGENT_STATUS_LABEL, p.status)} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Nível</dt>
            <dd className="font-medium text-zinc-900">{p.tier}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Classificação</dt>
            <dd className="font-medium text-zinc-900">{p.ratingAvg.toFixed(1)} ★</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Share de comissão</dt>
            <dd className="font-medium text-zinc-900">{(p.commissionShareBps / 100).toFixed(0)}%</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-400">
          Estes campos só podem ser alterados pela equipa. Para corrigir o IBAN ou o regime fiscal, contacte o suporte.
        </p>
      </Card>

      <Card title="Dados editáveis" icon="✏️">
        <form onSubmit={guardar} className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Telefone de contacto
            <input
              type="tel"
              value={phone || p.phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2449XXXXXXXX"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Banco (nome)
            <input
              type="text"
              value={bankName || (p.bankName ?? "")}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ex.: Banco BAI"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          {p.ibanMasked && (
            <p className="text-xs text-zinc-500">IBAN registado (não exibido por completo): {p.ibanMasked}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-zinc-300"
          >
            {saving ? "A guardar..." : "Guardar"}
          </button>
          {notice && <p className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">{notice}</p>}
        </form>
      </Card>

      {data.bank && (
        <Card title="Conta bancária" icon="🏦">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Banco</dt>
              <dd className="font-medium text-zinc-900">{data.bank.bank}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Titular</dt>
              <dd className="font-medium text-zinc-900">{data.bank.holderName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Estado</dt>
              <dd>
                <StatusBadge
                  status={data.bank.status}
                  label={label(BANK_ACCOUNT_STATUS_LABEL, data.bank.status)}
                />
              </dd>
            </div>
          </dl>
          {data.bank.status !== "VERIFICADO" && (
            <p className="mt-3 text-xs text-amber-700">
              A conta ainda não está verificada — só é possível solicitar pagamentos com conta «Verificada».
            </p>
          )}
        </Card>
      )}
    </div>
  );
}