"use client";

import { useRef, useState } from "react";
import { useApi } from "@/components/useApi";
import { Card, EmptyBox, ErrorBox, LoadingBox, StatusBadge } from "@/components/agent-ui";
import { PAYOUT_STATUS_LABEL, formatCentsToKz } from "@/components/agent-labels";

type PayoutItem = {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossAmountMinor: string;
  withholdingTaxMinor: string;
  netAmountMinor: string;
  status: string;
  reference: string | null;
  createdAt: string;
  paidAt: string | null;
  failureReason: string | null;
};

type PagamentosData = {
  request: {
    ok: boolean;
    reason: string | null;
    availableMinor: string;
    minPayoutMinor: string;
    hasVerifiedBankAccount: boolean;
    hasPendingPayout: boolean;
  };
  items: PayoutItem[];
};

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PagamentosPage() {
  const { data, error, loading, reload } = useApi<PagamentosData>("/api/agente/pagamentos");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  async function solicitar() {
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agente/pagamento-solicitar", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-idempotency-key": idempotencyKey.current,
        },
        body: "{}",
      });
      const body = await res.json().catch(() => null);
      if (res.status === 201) {
        setNotice("Pagamento solicitado com sucesso. Fica a aguardar aprovação.");
        await reload(); // atualiza saldo/pedidos
      } else if (res.ok) {
        setNotice("Pedido já registado (tentativa repetida). Nada foi duplicado.");
        await reload();
      } else {
        setNotice(body?.error ?? `Não foi possível solicitar (${res.status}).`);
      }
    } catch {
      setNotice("Falha de ligação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingBox label="A carregar pagamentos..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <EmptyBox title="Sem dados de pagamentos." />;

  const gate = data.request;

  return (
    <div className="flex flex-col gap-4">
      <Card title="Solicitar pagamento" icon="💰">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-600">
              Saldo disponível:{" "}
              <strong className="text-zinc-900">{formatCentsToKz(gate.availableMinor)}</strong>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Mínimo: {formatCentsToKz(gate.minPayoutMinor)} · Conta bancária verificada:{" "}
              {gate.hasVerifiedBankAccount ? "Sim" : "Não"} · Pedidos pendentes:{" "}
              {gate.hasPendingPayout ? "Sim" : "Não"}
            </p>
            {!gate.ok && gate.reason && (
              <p className="mt-2 text-sm font-medium text-amber-700">⚠️ {gate.reason}</p>
            )}
          </div>
          <button
            onClick={solicitar}
            disabled={!gate.ok || submitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
          >
            {submitting ? "A registar..." : "Solicitar pagamento"}
          </button>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">{notice}</p>}
      </Card>

      {data.items.length === 0 ? (
        <EmptyBox
          icon="💸"
          title="Sem pagamentos ainda."
          hint="Quando solicitar um pagamento, ele aparece aqui com o respetivo estado."
        />
      ) : (
        <Card title="Histórico de pagamentos" icon="🧾">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2">Período</th>
                  <th className="px-2 py-2">Bruto</th>
                  <th className="px-2 py-2">Retenção</th>
                  <th className="px-2 py-2">Líquido</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Solicitado</th>
                  <th className="px-2 py-2">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-2 py-2 text-zinc-600">
                      {shortDate(p.periodStart)} → {shortDate(p.periodEnd)}
                    </td>
                    <td className="px-2 py-2 text-zinc-600">{formatCentsToKz(p.grossAmountMinor)}</td>
                    <td className="px-2 py-2 text-zinc-600">{formatCentsToKz(p.withholdingTaxMinor)}</td>
                    <td className="px-2 py-2 font-semibold text-zinc-800">{formatCentsToKz(p.netAmountMinor)}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={p.status} label={PAYOUT_STATUS_LABEL[p.status] ?? p.status} />
                    </td>
                    <td className="px-2 py-2 text-zinc-500">{shortDate(p.createdAt)}</td>
                    <td className="px-2 py-2 text-zinc-500">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.items.some((p) => p.status === "FAILED" && p.failureReason) && (
            <div className="mt-3 space-y-1">
              {data.items
                .filter((p) => p.status === "FAILED" && p.failureReason)
                .map((p) => (
                  <p key={p.id} className="text-xs text-red-600">
                    Motivo da falha ({shortDate(p.createdAt)}): {p.failureReason}
                  </p>
                ))}
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-400">Mostra até 100 registos.</p>
        </Card>
      )}
    </div>
  );
}