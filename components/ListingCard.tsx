import Image from "next/image";
import Link from "next/link";
import { CATEGORY_ICONS, CATEGORY_SHORT, DEAL_TYPE_LABELS, formatKwanza, timeAgo } from "@/lib/utils";
import { fallbackImage } from "@/lib/images";
import type { SerializedListing } from "@/lib/listings";
import { FavoriteButton } from "@/components/FavoriteButton";

export function ListingCard({
  listing,
  favorited = false,
}: {
  listing: SerializedListing;
  favorited?: boolean;
}) {
  const coverSrc = listing.images[0] ?? fallbackImage(listing.category);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <FavoriteButton listingId={listing.id} initial={favorited} />
      {listing.featured && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm">
          ⭐ Destaque
        </span>
      )}
      <Link href={`/anuncio/${listing.id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        <Image
          src={coverSrc}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>
      <Link href={`/anuncio/${listing.id}`} className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-zinc-900 group-hover:text-emerald-700">
          {listing.title}
        </h3>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold text-emerald-700">{formatKwanza(listing.price)}</p>
          {listing.owner?.isVerified && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600" title="Vendedor verificado">
              ✔ Verificado
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600">
          {CATEGORY_ICONS[listing.category] ?? "📦"} {listing.subcategory ?? ""}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{listing.province}{listing.municipality ? `, ${listing.municipality}` : ""}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-600">
          <span>{timeAgo(listing.publishedAt ?? listing.createdAt)}</span>
          <span>{listing.views.toLocaleString("pt-AO")} 👁</span>
        </div>
        <div className="mt-1 truncate text-xs text-zinc-600">
          Por <span className="font-semibold text-zinc-800">{listing.owner?.companyName || listing.owner?.name || "Anónimo"}</span>
        </div>
      </Link>
      <div className="border-t border-zinc-100 p-3 pt-3">
        <Link
          href={`/anuncio/${listing.id}`}
          className="block w-full rounded-lg border border-emerald-600 px-4 py-2 text-center text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          Ver anúncio
        </Link>
      </div>
    </div>
  );
}
