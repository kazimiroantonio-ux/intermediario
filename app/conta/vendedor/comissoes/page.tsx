"use client";

import { useState } from "react";
import { useApi } from "@/components/useApi";
import { Card, EmptyBox, ErrorBox, LoadingBox, StatusBadge } from "@/components/agent-ui";
import { COMMISSION_STATUS_LABEL, formatCentsToKz } from "@/components/seller-labels";

const STATUS_OPTIONS = ["PENDING", "ACCRUED", "PAYABLE", "PAID", "REVERSED", "DISPUTED"];

type CommissionItem = {
  id: string;
  dealReference: string | null;
  dealAmountMinor: string;
  rateBps: number;
  totalCommissionMinor: string;
  agentAmountMinor: string;
  platformAmountMinor: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

type CommissionsData = {
  count: number;
  items: CommissionItem[];
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ComissoesPage() {
  const [status, setStatus] = useState<string>("");
  const [de, setDe] = useState<string>("");
  const [ate, setAte] = useState<string>("");

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  const query = params.toString();
  const url = query ? `/api/vendedor/comissoes?${query}` : "/api/vendedor/comissoes";

  const { data, error, loading, reload } = useApi<CommissionsData>(url);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Comissões" icon="💶">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            reload();
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {COMMISSION_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            De
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
            Até
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Filtrar
          </button>
        </form>
      </Card>

      {loading && <LoadingBox label="A carregar comissões..." />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyBox icon="💶" title="Sem comissões para esta seleção." hint="Ajuste os filtros ou aguarde novos negócios." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card title={`${data.count} comissões`} icon="🧾">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  <th className="px-2 py-2">Negócio</th>
                  <th className="px-2 py-2">Valor</th>
                  <th className="px-2 py-2">Taxa</th>
                  <th className="px-2 py-2">Comissão (paga)</th>
                  <th className="px-2 py-2">Parte do agente</th>
                  <th className="px-2 py-2">Parte plataforma</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Criada</th>
                  <th className="px-2 py-2">Paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-2 py-2 font-medium text-zinc-900">{c.dealReference ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">{formatCentsToKz(c.dealAmountMinor)}</td>
                    <td className="px-2 py-2 text-zinc-700">
                      <span className="text-xs text-zinc-600">{((c.rateBps / 100)).toFixed(0)}%</span>
                    </td>
                    <td className="px-2 py-2 font-semibold text-zinc-800">{formatCentsToKz(c.totalCommissionMinor)}</td>
                    <td className="px-2 py-2 text-zinc-700">{formatCentsToKz(c.agentAmountMinor)}</td>
                    <td className="px-2 py-2 text-zinc-700">{formatCentsToKz(c.platformAmountMinor)}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={c.status} label={COMMISSION_STATUS_LABEL[c.status] ?? c.status} />
                    </td>
                    <td className="px-2 py-2 text-zinc-700">{shortDate(c.createdAt)}</td>
                    <td className="px-2 py-2 text-zinc-700">{shortDate(c.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-600">Mostra até 100 registos.</p>
        </Card>
      )}
    </div>
  );
}