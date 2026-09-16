import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKwanza, timeAgo, CATEGORY_SHORT } from "@/lib/utils";
import { AdminAction } from "@/components/AdminAction";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_VERIFICATION: "Em verificação",
  VERIFIED: "Verificado",
  ACTIVE: "Publicado",
  EXPIRED: "Expirado",
  BLOCKED: "Removido",
  REJECTED: "Rejeitado",
  CLOSED: "Fechado",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-red-100 text-red-700",
  BLOCKED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  CLOSED: "bg-zinc-200 text-zinc-700",
};

export default async function AdminAnunciosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const estado = typeof params.estado === "string" ? params.estado : "";

  const where = estado ? { status: estado as never } : {};
  const listings = await prisma.listing.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, isVerified: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">Gestão de anúncios</h1>
        <div className="flex gap-2">
          {["", "PENDING_VERIFICATION", "VERIFIED", "ACTIVE", "BLOCKED", "REJECTED"].map((s) => (
            <Link
              key={s || "todos"}
              href={s ? `/admin/anuncios?estado=${s}` : "/admin/anuncios"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                estado === s ? "bg-purple-700 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {s ? STATUS_LABELS[s] : "Todos"}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Anúncio</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {l.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/anuncio/${l.id}`} className="block truncate font-medium text-zinc-900 hover:text-emerald-700">
                        {l.title}
                      </Link>
                      <p className="text-xs text-zinc-400">
                        {CATEGORY_SHORT[l.category] ?? l.category} · {timeAgo(l.createdAt)}
                        {l.isFeatured && " · ⭐"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {l.user.name}
                  {l.user.isVerified && <span className="ml-1 text-emerald-600">✔</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">{formatKwanza(l.price.toString())}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[l.status] ?? ""}`}>
                    {STATUS_LABELS[l.status] ?? l.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(l.status === "PENDING_VERIFICATION" || l.status === "VERIFIED" || l.status === "BLOCKED" || l.status === "REJECTED") && (
                      <AdminAction
                        endpoint="/api/admin/anuncios"
                        payload={{ id: l.id, action: "aprovar" }}
                        label="Aprovar"
                        color="emerald"
                      />
                    )}
                    {l.status !== "BLOCKED" && (
                      <AdminAction
                        endpoint="/api/admin/anuncios"
                        payload={{ id: l.id, action: "rejeitar" }}
                        label="Rejeitar"
                        color="red"
                      />
                    )}
                    {!l.isFeatured ? (
                      <AdminAction
                        endpoint="/api/admin/anuncios"
                        payload={{ id: l.id, action: "destacar" }}
                        label="⭐ Destacar"
                        color="amber"
                      />
                    ) : (
                      <AdminAction
                        endpoint="/api/admin/anuncios"
                        payload={{ id: l.id, action: "removerDestaque" }}
                        label="Remover destaque"
                        color="zinc"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                  Nenhum anúncio neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
