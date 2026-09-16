require("dotenv").config();
const BASE = "http://localhost:3000";

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0].trim());
  return cookies.join("; ");
}

(async () => {
  const admin = await login("admin3@intermediario.co.ao", "Admin12345!");
  const seller = await login("autonorte@demo.co.ao", "Demo12345!");

  const pages = [
    { path: "/", cookie: null },
    { path: "/listar", cookie: null },
    { path: "/anuncio", cookie: null, listing: true },
    { path: "/conta/publicidade", cookie: seller },
    { path: "/conta/verificacao", cookie: seller },
    { path: "/conta/reservas", cookie: seller },
    { path: "/admin/verificacoes", cookie: admin },
    { path: "/admin/banners", cookie: admin },
    { path: "/admin", cookie: admin },
  ];

  const prisma = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");

  for (const p of pages) {
    let url = `${BASE}${p.path}`;
    if (p.listing) {
      const db = new (prisma.PrismaClient)({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
      const l = await db.listing.findFirst({ where: { dealType: "ALUGUER" } });
      url += `/${l.id}`;
      await db.$disconnect();
    }
    const headers = p.cookie ? { Cookie: p.cookie } : {};
    const res = await fetch(url, { headers, redirect: "manual" });
    console.log(`${res.status === 200 ? "PASS" : "FAIL"} | ${p.path} -> ${res.status}${res.status === 307 || res.status === 302 ? " (redirect)" : ""}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });