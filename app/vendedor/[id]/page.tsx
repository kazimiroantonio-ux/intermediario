import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [seller, listings, reviewStats, reviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        phone: true,
        province: true,
        companyName: true,
        isVerified: true,
        createdAt: true,
      },
    }),
    prisma.listing.findMany({
      where: { userId: id, status: "ACTIVE" },
      include: {
        user: { select: { id: true, name: true, isVerified: true, companyName: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: 24,
    }),
    prisma.review.aggregate({
      where: { reviewedId: id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.findMany({
      where: { reviewedId: id },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!seller) notFound();

  const averageRating =
    reviewStats._avg?.rating !== null && reviewStats._avg?.rating !== undefined
      ? Math.round(reviewStats._avg.rating * 10) / 10
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 text-3xl font-bold text-white">
            {seller.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.image} alt={seller.name} className="h-full w-full object-cover" />
            ) : (
              (seller.companyName ?? seller.name).charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">
              {seller.companyName ?? seller.name}
              {seller.isVerified && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-xs font-bold text-emerald-700">
                  ✔ VERIFICADO
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {seller.companyName ? "Empresa" : "Vendedor particular"} · {seller.province ?? "Angola"} ·{" "}
              {timeAgo(seller.createdAt)} na plataforma
            </p>
            {averageRating !== null && (
              <p className="mt-1 text-sm font-medium text-amber-500">
                ★ {averageRating} ({typeof reviewStats._count === 'object' ? reviewStats._count._all ?? 0 : 0} avaliaçõ{reviewStats._count._all === 1 ? "es" : "es"})
              </p>
            )}
            {seller.bio && <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">{seller.bio}</p>}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold text-zinc-900">
        Anúncios ativos ({listings.length})
      </h2>
      {listings.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {serializeListings(listings).map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Sem anúncios ativos neste momento.
        </p>
      )}

      {reviews.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-bold text-zinc-900">Últimas avaliações</h2>
          <ul className="mt-4 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">{r.reviewer.name}</p>
                  <span className="text-xs text-amber-500">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-zinc-600">{r.comment}</p>}
                <p className="mt-1 text-xs text-zinc-400">{timeAgo(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
