import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";
import { ActivityContextSelector } from "@/components/ActivityContextSelector";

export default async function ContaOverview() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [listings, unread, activities] = await Promise.all([
    prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.message.count({
      where: {
        chatRoom: { OR: [{ sellerId: userId }, { buyerId: userId }] },
        senderId: { not: userId },
        isRead: false,
      },
    }),
    prisma.userActivity.count({ where: { userId } }),
  ]);

  const active = listings.filter((l) => l.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Visão geral</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Anúncios ativos</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{active}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Mensagens por ler</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{unread}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Atividades</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{activities}</p>
        </div>
      </div>

      <ActivityContextSelector />

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Os seus anúncios</h2>
          <Link href="/conta/anuncios" className="text-sm font-medium text-emerald-700 hover:underline">
            Ver todos
          </Link>
        </div>
        {listings.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serializeListings(listings).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Ainda não publicou anúncios.{" "}
            <Link href="/conta/anuncios/novo" className="font-medium text-emerald-700 hover:underline">
              Publicar o primeiro
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

async function headers() {
  const { headers: h } = await import("next/headers");
  return h();
}
