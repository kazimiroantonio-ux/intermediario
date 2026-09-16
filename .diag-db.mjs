import dotenv from "dotenv";
dotenv.config();
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const r = await prisma.$queryRawUnsafe("SELECT current_database() db, current_user usr;");
  console.log("OK_DB", JSON.stringify(r));
  const t = await prisma.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1 LIMIT 6;");
  console.log("TABLES", JSON.stringify(t));
} catch (e) {
  console.log("ERR", String(e.message).slice(0, 600));
  if (e.meta) console.log("META", JSON.stringify(e.meta).slice(0, 300));
} finally {
  await prisma.$disconnect();
}