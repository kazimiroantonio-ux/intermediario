import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/utils";
import { VerificationForm } from "@/components/VerificationForm";

export default async function VerificacaoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [user, activeRequest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true, companyName: true },
    }),
    prisma.verificationRequest.findFirst({
      where: { userId, status: { in: ["PENDENTE", "APROVADO"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Selo de verificação</h1>

      {user?.isVerified ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="flex items-center gap-2 font-semibold text-emerald-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">✔</span>
            O seu selo de verificado está ativo
          </p>
          <p className="mt-2 text-sm text-emerald-700">
            O selo aumenta a confiança dos compradores e destaca o seu perfil na plataforma.
          </p>
          {activeRequest?.expiresAt && (
            <p className="mt-2 text-xs text-emerald-600">
              Válido até {new Date(activeRequest.expiresAt).toLocaleDateString("pt-PT")}.
            </p>
          )}
        </div>
      ) : activeRequest?.status === "PENDENTE" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">Pedido em análise</p>
          <p className="mt-2 text-sm text-amber-700">
            O seu pedido de verificação foi recebido e está a ser analisado pela nossa equipa. Normalmente é aprovado em 24h.
          </p>
        </div>
      ) : (
        <VerificationForm price={PRICING.VERIFICACAO_PESSOAL} companyPrice={PRICING.VERIFICACAO_EMPRESA} />
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">O que significa verificadas?</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          <li>✔ Selo verde de verificação no seu perfil e anúncios</li>
          <li>✔ Maior confiança e mais negociações concluídas</li>
          <li>✔ Prioridade nos resultados de pesquisa</li>
          <li>✔ Válido durante 12 meses após aprovação</li>
        </ul>
      </div>
    </div>
  );
}

async function headers() {
  const { headers: h } = await import("next/headers");
  return h();
}