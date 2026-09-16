import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKwanza, timeAgo } from "@/lib/utils";

const COMMISSION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACCRUED: "Acumulada",
  PAYABLE: "Paga (em processamento)",
  PAID: "Paga",
  REVERSED: "Estornada",
  DISPUTED: "Em disputa",
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  PROCESSING: "Em processamento",
  PAID: "Liquidada",
  FAILED: "Falhou",
};

export default async function AgentComissoesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const agent = await prisma.agent.findFirst({ where: { userId: session.user.id } });
  if (!agent) redirect("/conta");

  const [commissions, payouts] = await Promise.all([
    prisma.commission.findMany({
      where: { deal: { agentId: agent.id } },
      select: {
        id: true,
        status: true,
        agentAmount: true,
        totalCommission: true,
        deal: { select: { reference: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentPayout.findMany({
      where: { agentId: agent.id },
      select: {
        id: true,
        status: true,
        netAmount: true,
        grossAmount: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
      },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Comissões e pagamentos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Comissões geradas pelos seus negócios e histórico de pagamentos.
        </p>
      </div>

      {/* Pagamentos */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Pagamentos recebidos</h2>
        {payouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            <p className="text-lg">🏦</p>
            <p className="mt-2 font-medium">Ainda sem pagamentos.</p>
            <p>Os pagamentos são processados ao final de cada período.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{formatKwanza(Number(p.netAmount) / 100)}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.periodStart.toLocaleDateString("pt-AO")} – {p.periodEnd.toLocaleDateString("pt-AO")} · {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                  </p>
                </div>
                {p.paidAt && (
                  <span className="text-xs text-emerald-600">Liquidado {timeAgo(p.paidAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comissões */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Comissões por negócio</h2>
        {commissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            <p className="text-lg">💰</p>
            <p className="mt-2 font-medium">Sem comissões registadas.</p>
            <p>As comissões aparecem aqui quando um negócio é concluído.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <ul className="space-y-3">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{c.deal?.reference}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {COMMISSION_STATUS_LABEL[c.status] ?? c.status} · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-semibold text-emerald-700">
                    {formatKwanza(Number(c.agentAmount) / 100)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}