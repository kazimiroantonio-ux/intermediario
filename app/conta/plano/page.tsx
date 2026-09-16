import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, formatKwanza } from "@/lib/utils";
import { PlanButton } from "./PlanButton";

export default async function PlanoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const latestTransaction = await prisma.transaction.findFirst({
    where: { userId, type: "PLANO", status: "PAID" },
    orderBy: { createdAt: "desc" },
  });

  const currentTier = latestTransaction?.planTier ?? "FREE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Plano Premium</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Destaque os seus anúncios, ganhe o selo de vendedor verificado e aceda a vantagens exclusivas.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.id === "PRO"
                  ? "border-emerald-500 bg-emerald-50/40 shadow-md ring-1 ring-emerald-500"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {plan.id === "PRO" && (
                <span className="mb-3 w-fit rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  MAIS POPULAR
                </span>
              )}
              <h2 className="text-lg font-bold text-zinc-900">{plan.name}</h2>
              <p className="mt-1 text-3xl font-extrabold text-zinc-900">
                {plan.price === 0 ? "Grátis" : formatKwanza(plan.price)}
                {plan.price > 0 && <span className="text-sm font-medium text-zinc-500">/mês</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5 text-sm text-zinc-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-emerald-600">✔</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <PlanButton
                  planId={plan.id}
                  planName={plan.name}
                  price={plan.price}
                  disabled={isCurrent || plan.price === 0}
                />
              </div>
              {isCurrent && (
                <p className="mt-2 text-center text-xs font-medium text-emerald-700">
                  Plano atual
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Ambiente de demonstração: o pagamento é simulado e o plano é ativado imediatamente.
        Em produção será integrado com Multicaixa Express / EMIS.{" "}
        <Link href="/conta" className="underline hover:text-zinc-600">
          Voltar ao painel
        </Link>
      </p>
    </div>
  );
}
