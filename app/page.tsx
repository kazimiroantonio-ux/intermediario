import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";
import { HeroBanner } from "@/components/HeroBanner";
import { SmartSearch } from "@/components/SmartSearch";
import { BannerRail } from "@/components/BannerRail";
import { CATEGORIES } from "@/lib/utils";
import { CATEGORY_IMAGES } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, recent, mostViewed, categoryCounts, statsListings, statsUsers, statsBusinesses, statsViews, businesses, heroBanners, midBanners] =
    await Promise.all([
      prisma.listing.findMany({
        where: { status: "ACTIVE", isFeatured: true },
        include: {
          user: { select: { id: true, name: true, isVerified: true, companyName: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
      }),
      prisma.listing.findMany({
        where: { status: "ACTIVE" },
        include: {
          user: { select: { id: true, name: true, isVerified: true, companyName: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 6,
      }),
      prisma.listing.findMany({
        where: { status: "ACTIVE" },
        include: {
          user: { select: { id: true, name: true, isVerified: true, companyName: true } },
        },
        orderBy: { views: "desc" },
        take: 6,
      }),
      prisma.listing.groupBy({
        by: ["category"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "VERIFIED_SELLER" } }),
      prisma.listing.aggregate({ _sum: { views: true } }),
      prisma.user.findMany({
        where: { role: "VERIFIED_SELLER" },
        select: {
          id: true,
          name: true,
          companyName: true,
          image: true,
          isVerified: true,
          province: true,
          createdAt: true,
          _count: { select: { listings: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.banner.findMany({
        where: { position: "HERO", status: "ATIVO", startDate: { lte: new Date() }, endDate: { gte: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.banner.findMany({
        where: { position: "HOME_MID", status: "ATIVO", startDate: { lte: new Date() }, endDate: { gte: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const counts: Record<string, number> = {};
  for (const c of categoryCounts) counts[c.category] = c._count._all;

  const totalViews = statsViews._sum.views ?? 0;

  const stats = [
    { value: `+${statsListings.toLocaleString("pt-AO")}`, label: "anúncios publicados" },
    { value: `+${statsUsers.toLocaleString("pt-AO")}`, label: "utilizadores registados" },
    { value: `+${statsBusinesses.toLocaleString("pt-AO")}`, label: "empresas parceiras" },
    { value: `+${totalViews.toLocaleString("pt-AO")}`, label: "visualizações" },
  ];

  return (
    <div>
      <HeroBanner />
      <SmartSearch />
      <div className="mx-auto max-w-6xl px-4">
        <BannerRail banners={heroBanners} />
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">Categorias</h2>
          <Link href="/listar" className="text-sm font-medium text-emerald-700 hover:underline">
            Ver todos os anúncios
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIES.map((cat, idx) => (
            <Link
              key={cat.slug}
              href={`/listar?categoria=${cat.slug}`}
              className="group relative h-32 overflow-hidden rounded-xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:h-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CATEGORY_IMAGES[cat.slug]?.[idx % (CATEGORY_IMAGES[cat.slug]?.length ?? 1)] ?? CATEGORY_IMAGES.OUTROS[0]}
                alt={cat.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/35 to-transparent" />
              <div className="relative flex h-full flex-col justify-between p-3 text-white sm:p-4">
                <div className="flex items-start justify-between">
                  <span className="text-xl drop-shadow sm:text-2xl">{cat.icon}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur sm:px-2.5 sm:text-xs">
                    {counts[cat.slug] ?? 0}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold drop-shadow sm:text-base">{cat.short}</h3>
                  <p className="line-clamp-1 text-[11px] text-white/75 sm:text-xs">{cat.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
            ⭐ Anúncios em destaque
          </h2>
          <Link href="/listar?destaque=1" className="text-sm font-medium text-emerald-700 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(featured.length > 0 ? featured : recent.slice(0, 3)).map((listing) => (
            <ListingCard key={listing.id} listing={serializeListings([listing])[0]} />
          ))}
        </div>
      </section>

      <section className="bg-zinc-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
              🆕 Novidades
            </h2>
            <Link href="/listar" className="text-sm font-medium text-emerald-700 hover:underline">
              Ver mais
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((listing) => (
              <ListingCard key={listing.id} listing={serializeListings([listing])[0]} />
            ))}
          </div>
          {recent.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <p className="text-lg font-medium text-zinc-700">Ainda não há anúncios publicados</p>
              <p className="mt-2 text-sm text-zinc-500">Seja o primeiro a publicar na plataforma.</p>
              <Link
                href="/conta/anuncios/novo"
                className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Publicar anúncio grátis
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
            🔥 Mais procurados
          </h2>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mostViewed.filter((l) => l.views > 0).slice(0, 3).map((listing) => (
            <ListingCard key={`mv-${listing.id}`} listing={serializeListings([listing])[0]} />
          ))}
        </div>
        {mostViewed.every((l) => l.views === 0) && (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Ainda sem visualizações suficientes para o ranking.
          </p>
        )}
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <BannerRail banners={midBanners} />
          <h2 className="text-2xl font-bold text-zinc-900">🤝 Empresas parceiras</h2>
          <p className="mt-1 text-sm text-zinc-500">Concessionárias, imobiliárias, lojas, agências e construtoras verificadas.</p>
          {businesses.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b) => (
                <Link
                  key={b.id}
                  href={`/vendedor/${b.id}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                    {b.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image} alt={b.companyName ?? b.name} className="h-full w-full object-cover" />
                    ) : (
                      (b.companyName ?? b.name).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">
                      {b.companyName ?? b.name}
                      {b.isVerified && <span className="ml-1 text-emerald-600" title="Verificado">✔</span>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {b.province ?? "Angola"} · {b._count.listings} anúncio{b._count.listings === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {["Concessionárias", "Imobiliárias", "Lojas", "Agências", "Construtoras"].map((tipo) => (
                <div key={tipo} className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center">
                  <p className="font-semibold text-zinc-700">{tipo}</p>
                  <Link href="/registar" className="mt-1 block text-xs font-medium text-emerald-700 hover:underline">
                    Junte-se como empresa
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-10 shadow-lg">
          <div className="grid gap-8 text-center text-white sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-emerald-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
