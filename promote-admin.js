require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const email = process.argv[2] || "qa@intermediario.co.ao";
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN", isVerified: true },
  });
  console.log(`OK: ${user.email} é agora ADMIN e verificado.`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(JSON.stringify({ message: e.message, code: e.code, meta: e.meta, cause: String(e.cause ?? "") }, null, 2));
  process.exit(1);
});
