import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { VerificationReview } from "@/components/VerificationReview";

export const dynamic = "force-dynamic";

export default async function AdminVerificacoesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "ADMIN") return null;

  const requests = await prisma.verificationRequest.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, companyName: true, isVerified: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const statusStyles: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-800",
    APROVADO: "bg-emerald-100 text-emerald-800",
    REJEITADO: "bg-red-100 text-red-700",
  };

  const pending = requests.filter((r) => r.status === "PENDENTE").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Pedidos de verificação</h1>
      <p className="text-sm text-zinc-500">
        {pending} pedido{pending === 1 ? "" : "s"} pendente{pending === 1 ? "" : "s"} de aprovação.
      </p>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          Ainda não há pedidos de verificação.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">
                    {r.user.companyName ?? r.user.name}
                    {r.user.isVerified && <span className="ml-1.5 text-xs text-emerald-600">✔ verificado</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {r.user.email} · Pedido feito {timeAgo(r.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">
                    {r.type === "EMPRESA"
                      ? "🏢 Verificação de empresa"
                      : "👤 Verificação de identidade pessoal"}
                  </p>
                  {r.documentUrl && (
                    <a
                      href={r.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline"
                    >
                      Ver documento
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                  {r.status === "PENDENTE" && (
                    <VerificationReview requestId={r.id} />
                  )}
                </div>
              </div>
              {r.expiresAt && (
                <p className="mt-2 text-xs text-zinc-400">
                  Válido até {new Date(r.expiresAt).toLocaleDateString("pt-PT")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function headers() {
  const { headers: h } = await import("next/headers");
  return h();
}