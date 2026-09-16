require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

(async () => {
  const KEEP_UNVERIFIED = "segtest@intermediario.co.ao";
  const res = await prisma.user.updateMany({
    where: { emailVerified: false, email: { not: KEEP_UNVERIFIED } },
    data: { emailVerified: true },
  });
  console.log(`emailVerified=true aplicado a ${res.count} utilizador(es) existente(s).`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
