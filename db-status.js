require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    select: { email: true, role: true, verified: true, planTier: true, _count: { select: { listings: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log("UTILIZADORES:");
  for (const u of users) console.log(` - ${u.email} role=${u.role} verificado=${u.verified} plano=${u.planTier} anuncios=${u._count.listings}`);

  const listings = await prisma.listing.findMany({
    select: { title: true, category: true, subcategory: true, dealType: true, status: true, featured: true, views: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  console.log("ANUNCIOS (ultimos):");
  for (const l of listings) console.log(` - ${l.title} [${l.category}/${l.subcategory ?? "-"}] ${l.dealType} status=${l.status} destaque=${l.featured} views=${l.views}`);

  const [favorites, reviews, notifications, reports, payments, reservations] = await Promise.all([
    prisma.favorite.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.notification.count(),
    prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.findMany({ select: { type: true, amount: true, status: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.reservation.count(),
  ]);
  console.log(`FAVORITOS=${favorites} RESERVAS=${reservations} NOTIFICACOES=${notifications}`);
  console.log(`AVALIACOES total=${reviews._count._all} media=${reviews._avg.rating}`);
  console.log("DENUNCIAS:", reports.map((r) => `${r.status}:${r._count._all}`).join(", "));
  console.log("PAGAMENTOS (ultimos):");
  for (const p of payments) console.log(` - ${p.type} ${p.amount} AOA [${p.status}]`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
