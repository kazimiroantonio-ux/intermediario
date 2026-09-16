"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import { Card, EmptyBox, ErrorBox, LoadingBox, StatCard, StatusBadge } from "@/components/agent-ui";
import {
  COMMISSION_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  RESERVATION_STATUS_LABEL,
  formatCentsToKz,
} from "@/components/seller-labels";

type DashboardData = {
  counts: {
    activeListings: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    pendingReservations: number;
    unreadMessages: number;
  };
  finance: {
    pendingMinor: string;
    paidMinor: string;
    revertedMinor: string;
    receivedMinor: string;
  };
  hasVerifiedBankAccount: boolean;
  recentDeals: {
    id: string;
    reference: string;
    status: string;
    title: string | null;
    buyerName: string | null;
    agreedPriceMinor: string | null;
    createdAt: string;
  }[];
  recentCommissions: {
    id: string;
    status: string;
    dealReference: string | null;
    totalCommissionMinor: string;
    createdAt: string;
    paidAt: string | null;
  }[];
  recentReservations: {
    id: string;
    status: string;
    listingTitle: string | null;
    buyerName: string | null;
    priceMinor: string;
    createdAt: string;
  }[];
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi<DashboardData>("/api/vendedor/dashboard");

  if (loading) return <LoadingBox label="A carregar o painel..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <EmptyBox title="Sem dados do painel." />;

  const { counts, finance } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-zinc-700">
          Anúncios ativos: <strong>{counts.activeListings}</strong>
          {" · "}
          Negócios abertos: <strong>{counts.openDeals}</strong>
          {" · "}
          Reservas pendentes: <strong>{counts.pendingReservations}</strong>
          {" · "}
          Mensagens por ler: <strong>{counts.unreadMessages}</strong>
        </p>
        <p className="mt-2 text-xs text-zinc-700">
          Comissões pendentes: <strong>{formatCentsToKz(finance.pendingMinor)}</strong>
          {" · "}
          Comissões pagas: <strong>{formatCentsToKz(finance.paidMinor)}</strong>
          {" · "}
          Recebido de transferências: <strong>{formatCentsToKz(finance.receivedMinor)}</strong>
          {!data.hasVerifiedBankAccount && (
            <span className="ml-2 text-amber-700">
              Adicione uma conta bancária verificada para receber transferências.
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="📢"
          label="Anúncios ativos"
          value={String(counts.activeListings)}
          sub="Imóveis publicados"
        />
        <StatCard
          icon="🤝"
          label="Negócios abertos"
          value={String(counts.openDeals)}
          sub="Em negociação"
        />
        <StatCard
          icon="🏆"
          label="Negócios fechados"
          value={String(counts.wonDeals)}
          sub="Vendas concluídas"
        />
        <StatCard
          icon="⚠️"
          label="Comissões pendentes"
          value={formatCentsToKz(finance.pendingMinor)}
          sub="Aguarda pagamento"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Negócios recentes" icon="🤝">
          {data.recentDeals.length === 0 ? (
            <EmptyBox icon="🤝" title="Ainda sem negócios." hint="Os negócios aparecem aqui quando um agente se junta." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentDeals.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {d.title ?? d.reference}
                    </p>
                    <p className="text-xs text-zinc-700">
                      {d.buyerName ? `Comprador: ${d.buyerName}` : d.reference} · {shortDate(d.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} label={d.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Comissões recentes" icon="💶">
          {data.recentCommissions.length === 0 ? (
            <EmptyBox icon="💶" title="Sem comissões ainda." hint="As comissões surgem após negócios fechados." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentCommissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{c.dealReference ?? "Negócio"}</p>
                    <p className="text-xs text-zinc-700">{shortDate(c.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-zinc-800">{formatCentsToKz(c.totalCommissionMinor)}</span>
                    <StatusBadge status={c.status} label={COMMISSION_STATUS_LABEL[c.status] ?? c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Reservas recentes" icon="📅">
        {data.recentReservations.length === 0 ? (
          <EmptyBox icon="📅" title="Sem reservas." hint="As reservas de visitas aparecem aqui." />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data.recentReservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">
                    {r.listingTitle ?? "Imóvel"}
                  </p>
                  <p className="text-xs text-zinc-700">
                    {r.buyerName ? `Visitante: ${r.buyerName}` : ""} · {shortDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-zinc-800">{formatCentsToKz(r.priceMinor)}</span>
                  <StatusBadge
                    status={r.status}
                    label={RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <p>
          <Link href="/conta/vendedor/negocios" className="font-semibold text-amber-700 hover:underline">
            Ver todos os negócios →
          </Link>
        </p>
      </div>
    </div>
  );
}