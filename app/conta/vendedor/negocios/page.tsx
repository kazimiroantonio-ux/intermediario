"use client";

import { useState } from "react";
import { useApi } from "@/components/useApi";
import { Card, EmptyBox, ErrorBox, LoadingBox, StatusBadge } from "@/components/agent-ui";
import { DEAL_TYPE_LABEL, formatCentsToKz } from "@/components/seller-labels";

const STATUS_OPTIONS = [
  "LEAD",
  "QUEUED",
  "AGENT_ASSIGNED",
  "QUALIFYING",
  "VISIT_SCHEDULED",
  "VISIT_DONE",
  "AGREED",
  "DEPOSIT_PENDING",
  "SETTLED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "EXPIRED_UNPAID",
  "SELLER_WITHDREW",
  "BUYER_WITHDREW",
  "DISPUTED",
];

type DealItem = {
  id: string;
  reference: string;
  type: string;
  status: string;
  title: string | null;
  buyerName: string | null;
  listedPriceMinor: string;
  agreedPriceMinor: string | null;
  createdAt: string;
  closedAt: string | null;
};

type DealsData = {
  count: number;
  items: DealItem[];
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NegociosPage() {
  const [status, setStatus] = useState<string>("");
  const [de, setDe] = useState<string>("");
  const [ate, setAte] = useState<string>("");

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  const query = params.toString();
  const url = query ? `/api/vendedor/negocios?${query}` : "/api/vendedor/negocios";

  const { data, error, loading, reload } = useApi<DealsData>(url);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Negócios" icon="🤝">
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
                  {s.replace(/_/g, " ").toLowerCase()}
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

      {loading && <LoadingBox label="A carregar negócios..." />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyBox icon="🤝" title="Sem negócios para esta seleção." hint="Ajuste os filtros ou aguarde novos leads." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <Card title={`${data.count} negócios`} icon="📋">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  <th className="px-2 py-2">Ref.</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Imóvel</th>
                  <th className="px-2 py-2">Comprador</th>
                  <th className="px-2 py-2">Preço listado</th>
                  <th className="px-2 py-2">Preço acordado</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Criado</th>
                  <th className="px-2 py-2">Fechado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((d) => (
                  <tr key={d.id}>
                    <td className="px-2 py-2 font-medium text-zinc-900">{d.reference}</td>
                    <td className="px-2 py-2 text-zinc-700">{DEAL_TYPE_LABEL[d.type] ?? d.type}</td>
                    <td className="px-2 py-2 text-zinc-700">{d.title ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">{d.buyerName ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">{formatCentsToKz(d.listedPriceMinor)}</td>
                    <td className="px-2 py-2 font-semibold text-zinc-800">
                      {d.agreedPriceMinor ? formatCentsToKz(d.agreedPriceMinor) : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={d.status} label={d.status.replace(/_/g, " ")} />
                    </td>
                    <td className="px-2 py-2 text-zinc-700">{shortDate(d.createdAt)}</td>
                    <td className="px-2 py-2 text-zinc-700">{shortDate(d.closedAt)}</td>
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