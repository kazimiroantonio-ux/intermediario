import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";

export default async function FavoritosPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session!.user.id },
    include: {
      listing: {
        include: {
          user: { select: { id: true, name: true, isVerified: true, companyName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Favoritos</h1>

      {favorites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Ainda não tem favoritos</p>
          <p className="mt-2 text-sm text-zinc-500">
            Toque no coração dos anúncios para os guardar aqui.
          </p>
          <Link
            href="/listar"
            className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Explorar anúncios
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((f) => (
            <ListingCard
              key={f.id}
              listing={serializeListings([f.listing])[0]}
              favorited
            />
          ))}
        </div>
      )}
    </div>
  );
}
