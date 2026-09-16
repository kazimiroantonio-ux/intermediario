import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdvertisingPanel } from "@/components/AdvertisingPanel";

export default async function PublicidadePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [myBanners, myFlash, myListings] = await Promise.all([
    prisma.banner.findMany({
      where: { advertiserId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.flashPromotion.findMany({
      where: { advertiserId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.listing.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, title: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Publicidade</h1>
      <p className="text-sm text-zinc-500">
        Promova os seus anúncios com banners patrocinados e promoções flash enviadas por notificação aos utilizadores.
      </p>

      <AdvertisingPanel
        listings={myListings.map((l) => ({ id: l.id, title: l.title }))}
        initialBanners={myBanners}
        initialFlash={myFlash}
      />
    </div>
  );
}

async function headers() {
  const { headers: h } = await import("next/headers");
  return h();
}