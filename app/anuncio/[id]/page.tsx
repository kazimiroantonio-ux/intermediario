import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serializeListing } from "@/lib/listings";
import {
  CATEGORY_LABELS,
  DEAL_TYPE_LABELS,
  formatKwanza,
  timeAgo,
} from "@/lib/utils";
import { ContactSeller } from "@/components/ContactSeller";
import { ReservationWidget } from "@/components/ReservationWidget";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Gallery } from "@/components/Gallery";
import { fallbackImage } from "@/lib/images";
import { ViewTracker } from "@/components/ViewTracker";
import { ReportDialog } from "@/components/ReportDialog";
import { ReviewSection } from "@/components/ReviewSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true, description: true },
  });
  if (!listing) return { title: "Anúncio não encontrado" };
  return { title: listing.title, description: listing.description.slice(0, 160) };
}

export default async function AnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
            createdAt: true,
            isVerified: true,
            companyName: true,
          },
        },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!listing || listing.status === "BLOCKED") notFound();

  const data = serializeListing(listing);

  const [reviewStats, sellerListingsCount, favorited] = await Promise.all([
    prisma.review.aggregate({
      where: { reviewedId: data.userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.listing.count({ where: { userId: data.userId, status: "ACTIVE" } }),
    session
      ? prisma.favorite.findUnique({
          where: {
            userId_listingId: { userId: session.user.id, listingId: id },
          },
        })
      : null,
  ]);

  const reviews = await prisma.review.findMany({
    where: { reviewedId: data.userId },
    include: { reviewer: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const averageRating =
    reviewStats._avg?.rating !== null && reviewStats._avg?.rating !== undefined
      ? Math.round(reviewStats._avg.rating * 10) / 10
      : null;

  const whatsappNumber = data.owner?.phone?.replace(/[^\d+]/g, "").replace("+", "");
  const waMessage = encodeURIComponent(
    `Olá! Vi o seu anúncio "${data.title}" no site O Intermediário. Ainda está disponível?`
  );

  const galleryImages = data.images.map((url, i) => ({
    id: String(i),
    url,
    alt: data.title,
  }));

  const attributeEntries = Object.entries(data.attributes);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ViewTracker listingId={id} />
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-emerald-700">Início</Link>
        <span className="mx-2">›</span>
        <Link href={`/listar?categoria=${data.category}`} className="hover:text-emerald-700">
          {CATEGORY_LABELS[data.category] ?? data.category}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-zinc-700">{data.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Gallery images={galleryImages} title={data.title} fallback={fallbackImage(data.category)} />

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {CATEGORY_LABELS[data.category] ?? data.category}
                {data.subcategory ? ` · ${data.subcategory}` : ""}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {DEAL_TYPE_LABELS[data.dealType as keyof typeof DEAL_TYPE_LABELS]}
              </span>
              {data.featured && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  ⭐ Destaque
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">{data.title}</h1>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Localização</dt>
                <dd className="font-medium text-zinc-900">
                  {data.province}{data.municipality ? `, ${data.municipality}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Publicado</dt>
                <dd className="font-medium text-zinc-900">{timeAgo(data.publishedAt ?? data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Código</dt>
                <dd className="font-mono text-xs font-medium text-zinc-900">{data.id}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Visualizações</dt>
                <dd className="font-medium text-zinc-900">{data.views.toLocaleString("pt-AO")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Estado</dt>
                <dd className="font-medium text-zinc-900">{DEAL_TYPE_LABELS[data.dealType as keyof typeof DEAL_TYPE_LABELS]}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Atualizado</dt>
                <dd className="font-medium text-zinc-900">{timeAgo(data.updatedAt)}</dd>
              </div>
            </dl>

            <h2 className="mt-6 text-lg font-semibold text-zinc-900">Descrição</h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-zinc-700">{data.description}</p>
          </div>

          {attributeEntries.length > 0 && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">Características</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {attributeEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
                    <dt className="capitalize text-sm text-zinc-500">{key.replace(/_/g, " ")}</dt>
                    <dd className="text-sm font-medium text-zinc-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-6">
            <ReviewSection
              sellerId={data.userId}
              sellerName={data.owner?.name ?? "Vendedor"}
              reviews={reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt.toISOString(),
                author: { id: r.reviewer.id, name: r.reviewer.name, image: r.reviewer.image },
              }))}
              average={averageRating}
              total={typeof reviewStats._count === 'object' ? reviewStats._count._all ?? 0 : 0}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-emerald-700">{formatKwanza(data.price)}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {data.dealType === "ALUGUER" ? "por período de aluguer" : "preço de venda"}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <ContactSeller listingId={data.id} sellerName={data.owner?.name ?? "Vendedor"} />
                <FavoriteButton listingId={data.id} initial={!!favorited} variant="page" />
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-5 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
              {data.dealType === "ALUGUER" && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <ReservationWidget listingId={data.id} listingTitle={data.title} price={data.price} />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-bold text-white">
                  {data.owner?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.owner.image} alt={data.owner.name} className="h-full w-full object-cover" />
                  ) : (
                    (data.owner?.name ?? "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">
                    {data.owner?.companyName || data.owner?.name || "Vendedor"}
                    {data.owner?.isVerified && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 align-middle">
                        ✔ VERIFICADO
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-amber-500">
                    {averageRating !== null ? `★ ${averageRating} (${typeof reviewStats._count === 'object' ? reviewStats._count._all ?? 0 : 0})` : "Sem avaliações"}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
                <li>📢 {sellerListingsCount} anúncio{sellerListingsCount === 1 ? "" : "s"} ativo{sellerListingsCount === 1 ? "" : "s"}</li>
                {data.owner?.phone && (
                  <li>📞 <a href={`tel:${data.owner.phone}`} className="hover:text-emerald-700">{data.owner.phone}</a></li>
                )}
                <li>🕒 {data.owner ? `${timeAgo(data.owner.createdAt ?? new Date())} na plataforma` : ""}</li>
                <li>📍 {data.province}{data.municipality ? `, ${data.municipality}` : ""}</li>
              </ul>
              <div className="mt-4 border-t border-zinc-100 pt-3 text-right">
                <ReportDialog listingId={data.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
