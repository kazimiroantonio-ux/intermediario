require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const BASE = "http://localhost:3000";

const ACCOUNTS = [
  { name: "Administrador", email: "admin3@intermediario.co.ao", password: "Admin12345!", admin: true },
  { name: "Manuel Teste", email: "teste2@intermediario.co.ao", password: "Teste12345!", admin: false },
  { name: "Comprador Demo", email: "comprador2@intermediario.co.ao", password: "Comprador123!", admin: false },
];

async function signup(name, email, password) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.status === 429) {
      console.log(`  rate limited, waiting 20s (${email})`);
      await new Promise((r) => setTimeout(r, 20000));
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok || String(body.code).includes("USER_ALREADY_EXISTS") || res.status === 422) {
      return true;
    }
    throw new Error(`signup ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  throw new Error(`signup ${email}: too many retries`);
}

(async () => {
  for (const a of ACCOUNTS) {
    await signup(a.name, a.email, a.password);
    if (a.admin) {
      await prisma.user.update({ where: { email: a.email }, data: { role: "ADMIN", isVerified: true } });
      console.log(`OK: ${a.email} promovido a ADMIN`);
    } else {
      console.log(`OK: ${a.email}`);
    }
  }
  await prisma.$disconnect();
  console.log("Done.");
})().catch((e) => { console.error(e); process.exit(1); });