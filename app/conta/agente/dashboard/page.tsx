"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import { Card, EmptyBox, ErrorBox, LoadingBox, StatCard, StatusBadge } from "@/components/agent-ui";
import {
  AGENT_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  PAYOUT_STATUS_LABEL,
  formatCentsToKz,
} from "@/components/agent-labels";

type DashboardData = {
  agent: { code: string; status: string; tier: string; ratingAvg: number; approvedAt: string | null };
  balances: {
    availableMinor: string;
    pendingMinor: string;
    outstandingMinor: string;
    totalReceivedMinor: string;
    disputedMinor: string;
  };
  hasVerifiedBankAccount: boolean;
  hasPendingPayout: boolean;
  recentCommissions: {
    id: string;
    status: string;
    dealReference: string | null;
    agentAmountMinor: string;
    createdAt: string;
  }[];
  recentPayouts: {
    id: string;
    status: string;
    netAmountMinor: string;
    createdAt: string;
    paidAt: string | null;
    reference: string | null;
  }[];
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi<DashboardData>("/api/agente/dashboard");

  if (loading) return <LoadingBox label="A carregar o painel..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <EmptyBox title="Sem dados do painel." />;

  const { agent, balances } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600">
          <span>
            Estado: <StatusBadge status={agent.status} label={AGENT_STATUS_LABEL[agent.status] ?? agent.status} />
          </span>
          <span>Nível: {agent.tier}</span>
          <span>Classificação: {agent.ratingAvg.toFixed(1)} ★</span>
          <span>Código: {agent.code}</span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Saldo total pendente (por receber): <strong>{formatCentsToKz(balances.outstandingMinor)}</strong>
          {!data.hasVerifiedBankAccount && (
            <span className="ml-2 text-amber-700">
              Adicione uma conta bancária verificada para solicitar pagamentos.
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="💰"
          label="Saldo disponível"
          value={formatCentsToKz(balances.availableMinor)}
          sub="Comissões PAYABLE prontas"
        />
        <StatCard
          icon="⏳"
          label="Comissões pendentes"
          value={formatCentsToKz(balances.pendingMinor)}
          sub="PENDING + ACCRUED"
        />
        <StatCard
          icon="✅"
          label="Total recebido"
          value={formatCentsToKz(balances.totalReceivedMinor)}
          sub="Pagamentos já PAID"
        />
        <StatCard
          icon="⚠️"
          label="Em disputa"
          value={formatCentsToKz(balances.disputedMinor)}
          sub="Comissões DISPUTED"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Comissões recentes" icon="💶">
          {data.recentCommissions.length === 0 ? (
            <EmptyBox icon="💶" title="Ainda sem comissões." hint="As comissões aparecem aqui após negócios fechados." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentCommissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{c.dealReference ?? "Negócio"}</p>
                    <p className="text-xs text-zinc-500">{shortDate(c.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-zinc-800">{formatCentsToKz(c.agentAmountMinor)}</span>
                    <StatusBadge status={c.status} label={COMMISSION_STATUS_LABEL[c.status] ?? c.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pagamentos recentes" icon="💸">
          {data.recentPayouts.length === 0 ? (
            <EmptyBox
              icon="💸"
              title="Sem pagamentos ainda."
              hint='Use o botão "Solicitar pagamento" quando tiver saldo disponível.'
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentPayouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{p.reference ?? "Pagamento"}</p>
                    <p className="text-xs text-zinc-500">
                      {p.paidAt ? `Pago em ${shortDate(p.paidAt)}` : `Pedido em ${shortDate(p.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-zinc-800">{formatCentsToKz(p.netAmountMinor)}</span>
                    <StatusBadge status={p.status} label={PAYOUT_STATUS_LABEL[p.status] ?? p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p>
          <Link href="/conta/agente/pagamentos" className="font-semibold text-emerald-700 hover:underline">
            Ir para Pagamentos →
          </Link>{" "}
          para solicitar o levantamento do saldo disponível.
        </p>
      </div>
    </div>
  );
}