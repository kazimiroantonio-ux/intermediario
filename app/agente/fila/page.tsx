import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FIRST_CONTACT_SLA_MINUTES, DEAL_STAGE_LABEL } from "@/lib/agentOps";
import { timeAgo } from "@/lib/utils";
import type { DealStatus } from "@prisma/client";

export default async function AgentFilaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const agent = await prisma.agent.findFirst({ where: { userId: session.user.id } });
  if (!agent) redirect("/conta");

  const ACTIVE: DealStatus[] = ["QUEUED", "AGENT_ASSIGNED", "QUALIFYING", "FEES_PENDING", "VISIT_SCHEDULED", "VISIT_DONE", "RELATORIO_SOLICITADO", "DUE_DILIGENCE", "REPORT_DELIVERED", "NEGOTIATING", "AGREED", "DEPOSIT_PENDING", "DEPOSIT_PAID", "ACT_SCHEDULED", "ACT_IN_PROGRESS"];

  const items = await prisma.deal.findMany({
    where: { agentId: agent.id, status: { in: ACTIVE } },
    select: {
      id: true,
      reference: true,
      status: true,
      queuedAt: true,
      firstContactAt: true,
      listing: { select: { title: true } },
    },
    orderBy: { queuedAt: "desc" },
  });

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Fila de trabalho</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Negócios activos que necessitam de ação.
        </p>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          <p className="text-lg">✨</p>
          <p className="mt-2 font-medium">Fila vazia.</p>
          <p>Não tem negócios pendentes no momento.</p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((d) => {
          const queuedMs = d.queuedAt?.getTime() ?? null;
          const hasContacted = d.firstContactAt != null;
          const overdue = queuedMs && !hasContacted && (nowMs - queuedMs) / 60_000 > FIRST_CONTACT_SLA_MINUTES;

          return (
            <li key={d.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{d.listing?.title ?? d.reference}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {d.reference} · {DEAL_STAGE_LABEL[d.status as never] ?? d.status}
                </p>
              </div>
              <div className="text-right text-xs">
                {queuedMs && (
                  <p className={overdue ? "font-semibold text-red-600" : "text-zinc-500"}>
                    {overdue ? "⚠ Primeiro contacto em atraso" : `Fila ${timeAgo(new Date(queuedMs))}`}
                  </p>
                )}
                {hasContacted && (
                  <p className="mt-0.5 text-emerald-700">✓ Primeiro contacto feito</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}