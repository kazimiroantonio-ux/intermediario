require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const plans = [
    { name: "Grátis", slug: "free", priceInKz: 0, durationDays: 30, maxListings: 5, hasBadge: false },
    { name: "Profissional", slug: "pro", priceInKz: 15000, durationDays: 30, maxListings: 50, hasBadge: true },
    { name: "Empresa", slug: "enterprise", priceInKz: 50000, durationDays: 30, maxListings: 999, hasBadge: true },
  ];

  const packages = [
    { name: "Destaque Home - 7 dias", position: "HOME_HERO", durationDays: 7, priceInKz: 5000 },
    { name: "Destaque Home - 30 dias", position: "HOME_HERO", durationDays: 30, priceInKz: 15000 },
    { name: "Destaque Categoria - 7 dias", position: "CATEGORY_TOP", durationDays: 7, priceInKz: 3500 },
    { name: "Destaque Categoria - 30 dias", position: "CATEGORY_TOP", durationDays: 30, priceInKz: 9000 },
    { name: "Boost de Busca - 7 dias", position: "SEARCH_BOOST", durationDays: 7, priceInKz: 2500 },
    { name: "Boost de Busca - 30 dias", position: "SEARCH_BOOST", durationDays: 30, priceInKz: 6000 },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({ where: { slug: p.slug }, update: p, create: p });
    console.log("PLAN", p.slug, "OK");
  }
  for (const pk of packages) {
    const existing = await prisma.promotionPackage.findFirst({ where: { name: pk.name } });
    if (existing) await prisma.promotionPackage.update({ where: { id: existing.id }, data: pk });
    else await prisma.promotionPackage.create({ data: pk });
    console.log("PACKAGE", pk.name, "OK");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());