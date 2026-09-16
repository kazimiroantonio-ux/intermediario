import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { formatKwanza } from "@/lib/utils";
import { ListingActions } from "@/components/ListingActions";

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

export default async function MeusAnunciosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const listings = await prisma.listing.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Meus anúncios</h1>
        <Link
          href="/conta/anuncios/novo"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Publicar novo
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Não tem anúncios</p>
          <p className="mt-2 text-sm text-zinc-500">Publique o seu primeiro anúncio grátis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {serializeListings(listings).map((l) => (
            <div key={l.id} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🚗</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`/anuncio/${l.id}`} className="block truncate font-semibold text-zinc-900 hover:text-emerald-700">
                    {l.title}
                  </Link>
                  <p className="text-sm font-medium text-emerald-700">{formatKwanza(l.price)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[l.status]}`}>
                    {STATUS_LABELS[l.status] ?? l.status}
                  </span>
                </div>
              </div>
              <ListingActions listingId={l.id} status={l.status} />
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
