import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKwanza, timeAgo } from "@/lib/utils";
import { BannerAdminControls } from "@/components/BannerAdminControls";
import { BannerThumb } from "@/components/BannerThumb";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "ADMIN") return null;

  const banners = await prisma.banner.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const positionLabels: Record<string, string> = {
    HERO: "Topo da home",
    HOME_MID: "Meio da home",
    LISTING_TOP: "Topo das listagens",
  };

  const statusStyles: Record<string, string> = {
    ATIVO: "bg-emerald-100 text-emerald-800",
    PAUSADO: "bg-zinc-100 text-zinc-600",
    EXPIRADO: "bg-red-100 text-red-700",
  };

  const totalRevenue = banners
    .filter((b) => b.status === "ATIVO" || b.status === "PAUSADO")
    .length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Banners patrocinados</h1>
      <p className="text-sm text-zinc-500">
        {banners.length} banner{banners.length === 1 ? "" : "s"} no total · {totalRevenue} ativo{totalRevenue === 1 ? "" : "s"} ou pausado{totalRevenue === 1 ? "" : "s"} recebendo {formatKwanza(totalRevenue * 15000)} em reservas (estimativa).
      </p>

      {banners.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          Ainda não há banners. Os anunciantes compram banners na página /conta/publicidade.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div key={b.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <BannerThumb
                src={b.imageUrl}
                alt={b.title}
                className="h-28 w-full rounded-lg bg-zinc-100 object-cover"
              />
              <p className="mt-3 font-semibold text-zinc-900">{b.title}</p>
              <p className="text-xs text-zinc-500">
                {positionLabels[b.position] ?? b.position} · criado {timeAgo(b.createdAt)}
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(b.startDate).toLocaleDateString("pt-PT")} a {new Date(b.endDate).toLocaleDateString("pt-PT")}
              </p>
              <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                <span>👁 {b.impressions}</span>
                <span>🖱 {b.clicks}</span>
              </div>
              <a
                href={b.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-xs text-emerald-700 hover:underline"
              >
                {b.linkUrl}
              </a>
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[b.status] ?? ""}`}>
                  {b.status}
                </span>
                <BannerAdminControls bannerId={b.id} status={b.status} />
              </div>
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