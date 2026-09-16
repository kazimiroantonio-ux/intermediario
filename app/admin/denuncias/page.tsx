import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { AdminAction } from "@/components/AdminAction";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam/duplicado",
  FRAUDE: "Fraude",
  CONTEUDO_INAPROPRIADO: "Conteúdo inapropriado",
  PREÇO_ENGANOSO: "Preço enganoso",
  PRODUTO_ILEGAL: "Produto ilegal",
  OUTRO: "Outro",
};

const STATUS_STYLES: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-800",
  ANALISADO: "bg-emerald-100 text-emerald-800",
  REJEITADO: "bg-zinc-200 text-zinc-600",
};

export default async function AdminDenunciasPage() {
  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true, status: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Gestão de denúncias</h1>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Sem denúncias</p>
          <p className="mt-2 text-sm text-zinc-500">A plataforma está tranquila. 🎉</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className={`rounded-xl border p-4 ${
              r.status === "PENDENTE" ? "border-amber-200 bg-white" : "border-zinc-200 bg-white"
            }`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">
                    🚩 {REASON_LABELS[r.reason] ?? r.reason}
                    <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Anúncio:{" "}
                    {r.listing ? (
                      <Link href={`/anuncio/${r.listing.id}`} className="font-medium text-emerald-700 hover:underline">
                        {r.listing.title}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">(removido)</span>
                    )}
                    {r.listing && (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/anuncios?estado=${r.listing.status}`}
                          className="text-xs text-purple-700 hover:underline"
                        >
                          estado: {r.listing.status}
                        </Link>
                      </>
                    )}
                  </p>
                  {r.description && <p className="mt-1 rounded-lg bg-zinc-50 p-2 text-sm text-zinc-600">"{r.description}"</p>}
                  <p className="mt-2 text-xs text-zinc-400">
                    Denunciado por {r.reporter.name} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                {r.status === "PENDENTE" && (
                  <div className="flex gap-2">
                    <AdminAction
                      endpoint="/api/admin/denuncias"
                      payload={{ id: r.id, status: "ANALISADO" }}
                      label="Marcar analisada"
                      color="emerald"
                    />
                    <AdminAction
                      endpoint="/api/admin/denuncias"
                      payload={{ id: r.id, status: "REJEITADO" }}
                      label="Rejeitar"
                      color="red"
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
