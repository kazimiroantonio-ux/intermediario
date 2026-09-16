import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKwanza, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    totalListings,
    publishedListings,
    pendingListings,
    featuredListings,
    totalUsers,
    businessUsers,
    verifiedUsers,
    totalReports,
    pendingReports,
    revenueAgg,
    pendingVerifications,
    recentListings,
    recentUsers,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.listing.count({ where: { isFeatured: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { companyName: { not: null } } }),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.report.count(),
    prisma.report.count({ where: { status: "PENDENTE" } }),
    prisma.transaction.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.verificationRequest.count({ where: { status: "PENDENTE" } }),
    prisma.listing.findMany({
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const cards = [
    { label: "Anúncios publicados", value: publishedListings, href: "/admin/anuncios", color: "text-emerald-600" },
    { label: "Em verificação", value: pendingListings, href: "/admin/anuncios?estado=PENDING_VERIFICATION", color: "text-amber-600" },
    { label: "Em destaque", value: featuredListings, href: "/admin/anuncios", color: "text-blue-600" },
    { label: "Total de anúncios", value: totalListings, href: "/admin/anuncios", color: "text-zinc-900" },
    { label: "Utilizadores", value: totalUsers, href: "/admin/utilizadores", color: "text-zinc-900" },
    { label: "Empresas", value: businessUsers, href: "/admin/utilizadores", color: "text-purple-600" },
    { label: "Vendedores verificados", value: verifiedUsers, href: "/admin/utilizadores", color: "text-emerald-600" },
    { label: "Denúncias pendentes", value: pendingReports, href: "/admin/denuncias", color: pendingReports > 0 ? "text-red-600" : "text-zinc-900" },
    { label: "Verificações pendentes", value: pendingVerifications, href: "/admin/verificacoes", color: pendingVerifications > 0 ? "text-amber-600" : "text-zinc-900" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Visão geral</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className={`mt-1 text-3xl font-bold ${c.color}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Receita da plataforma</h2>
        <p className="mt-1 text-3xl font-bold text-emerald-700">
          {formatKwanza(revenueAgg._sum.amount?.toString() ?? "0")}
        </p>
        <p className="mt-1 text-xs text-zinc-400">Planos, destaques, verificações, comissões, banners e promoções flash (pagamentos simulados).</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Anúncios recentes</h2>
            <Link href="/admin/anuncios" className="text-xs font-medium text-emerald-700 hover:underline">Ver todos</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recentListings.map((l: { id: string; title: string; status: import("@prisma/client").ListingStatus; createdAt: Date }) => (
              <li key={l.id} className="flex items-center gap-3 text-sm">
                <span>{l.status === "ACTIVE" ? "🟢" : ["DRAFT", "PENDING_VERIFICATION", "VERIFIED"].includes(l.status) ? "🟡" : "🔴"}</span>
                <Link href={`/anuncio/${l.id}`} className="min-w-0 flex-1 truncate font-medium text-zinc-800 hover:text-emerald-700">
                  {l.title}
                </Link>
                <span className="shrink-0 text-xs text-zinc-400">{timeAgo(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Utilizadores recentes</h2>
            <Link href="/admin/utilizadores" className="text-xs font-medium text-emerald-700 hover:underline">Ver todos</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recentUsers.map((u: { id: string; name: string; email: string; companyName: string | null; createdAt: Date }) => (
              <li key={u.id} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-800">{u.companyName ?? u.name}</p>
                  <p className="truncate text-xs text-zinc-400">{u.email}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
