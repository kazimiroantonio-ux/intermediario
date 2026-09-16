import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowedDealStages, DEAL_STAGE_LABEL, dealStageTone } from "@/lib/agentOps";
import { formatKwanza, timeAgo } from "@/lib/utils";

export default async function AgentNegociosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const agent = await prisma.agent.findFirst({ where: { userId: session.user.id } });
  if (!agent) redirect("/conta");

  const deals = await prisma.deal.findMany({
    where: { agentId: agent.id },
    select: {
      id: true,
      reference: true,
      status: true,
      listedPrice: true,
      agreedPrice: true,
      createdAt: true,
      seller: { select: { name: true } },
      buyer: { select: { name: true } },
      listing: { select: { title: true, province: true, municipality: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tones: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    zinc: "bg-zinc-100 text-zinc-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Negócios</h1>
        <p className="mt-1 text-sm text-zinc-500">Lista de todos os seus negócios atribuídos.</p>
      </div>

      {deals.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          <p className="text-lg">📭</p>
          <p className="mt-2 font-medium">Sem negócios atribuídos.</p>
          <p>Aguarda a atribuição de novos negócios pela equipa.</p>
        </div>
      )}

      <div className="space-y-4">
        {deals.map((d) => {
          const tone = dealStageTone(d.status as never);
          const allowed = allowedDealStages(d.status as never);
          const location = [d.listing?.municipality, d.listing?.province].filter(Boolean).join(", ");
          return (
            <div key={d.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{d.listing?.title ?? d.reference}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{d.reference} · {location || "Sem localização"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
                  {DEAL_STAGE_LABEL[d.status as never] ?? d.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600 sm:grid-cols-4">
                <span> seller: {d.seller?.name ?? "—"}</span>
                <span> buyer: {d.buyer?.name ?? "—"}</span>
                <span> listado: {formatKwanza(Number(d.listedPrice) / 100)}</span>
                <span> criado: {timeAgo(d.createdAt)}</span>
              </div>
              {allowed.length > 0 && (
                <p className="mt-3 text-xs text-zinc-400">Próximos passos possíveis: {allowed.map((s) => DEAL_STAGE_LABEL[s]).join(", ")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}