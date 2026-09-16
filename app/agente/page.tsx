import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agentDealSummary, agentFinanceSummary, DEAL_STAGE_LABEL } from "@/lib/agentOps";
import { formatKwanza } from "@/lib/utils";

export default async function AgentePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const agent = await prisma.agent.findFirst({ where: { userId: session.user.id } });
  if (!agent) redirect("/conta");

  const nowIso = new Date().toISOString();
  const [deals, commissions, payouts] = await Promise.all([
    prisma.deal.findMany({
      where: { agentId: agent.id },
      select: {
        reference: true,
        status: true,
        createdAt: true,
        queuedAt: true,
        firstContactAt: true,
        agreedPrice: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commission.findMany({
      where: { deal: { agentId: agent.id } },
      select: { status: true, agentAmount: true },
    }),
    prisma.agentPayout.findMany({
      where: { agentId: agent.id },
      select: { status: true, netAmount: true, periodStart: true },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  const dealSummary = agentDealSummary(
    deals.map((d) => ({
      id: d.reference,
      reference: d.reference,
      status: d.status as never,
      createdAtIso: d.createdAt.toISOString(),
      queuedAtIso: d.queuedAt?.toISOString() ?? null,
      firstContactAtIso: d.firstContactAt?.toISOString() ?? null,
      agreedPriceCents: d.agreedPrice,
    })),
    nowIso
  );

  const finance = agentFinanceSummary(
    commissions.map((c) => ({
      id: c.status,
      status: c.status,
      agentAmountCents: c.agentAmount,
    })),
    payouts.map((p) => ({
      id: p.status,
      status: p.status,
      netAmountCents: p.netAmount,
      periodStartIso: p.periodStart.toISOString(),
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Painel do agente</h1>
        <p className="mt-1 text-sm text-zinc-500">Resumo rápido do seu trabalho.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Em pipeline" value={String(dealSummary.open)} tone="blue" />
        <Card label="Por contactar" value={String(dealSummary.overdueFirstContact)} tone={dealSummary.overdueFirstContact > 0 ? "amber" : "zinc"} />
        <Card label="Ganhos" value={String(dealSummary.won)} tone="green" />
        <Card label="Perdidos" value={String(dealSummary.lost)} tone="red" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card label="Por receber" value={formatKwanza((Number(finance.pendingCents) / 100).toFixed(0))} tone="amber" />
        <Card label="Já recebido" value={formatKwanza((Number(finance.paidCents) / 100).toFixed(0))} tone="green" />
        <Card label="Idade média (dias)" value={String(dealSummary.pipelineDays)} tone="zinc" />
      </div>

      {Object.keys(dealSummary.byState).length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Negócios por estado</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(dealSummary.byState)
              .sort((a, b) => b[1] - a[1])
              .map(([state, count]) => (
                <li key={state} className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0">
                  <span className="text-zinc-700">{DEAL_STAGE_LABEL[state as keyof typeof DEAL_STAGE_LABEL] ?? state}</span>
                  <span className="font-medium text-zinc-900">{count}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: string }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800",
    blue: "bg-blue-50 text-blue-800",
    zinc: "bg-zinc-50 text-zinc-800",
  };
  return (
    <div className={`rounded-xl border border-zinc-200 p-4 ${colors[tone] ?? colors.zinc}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}