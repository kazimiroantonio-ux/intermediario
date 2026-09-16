require("dotenv").config();
const crypto = require("crypto");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const BASE = "http://localhost:3000";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const SECRET = process.env.MULTICAIXA_WEBHOOK_SECRET;

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`PASS | ${name}${extra ? " | " + extra : ""}`); }
  else { fail++; console.log(`FAIL | ${name}${extra ? " | " + extra : ""}`); }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0].trim());
  return cookies.join("; ");
}

function sign(raw, secret) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

(async () => {
  const cookie = await login("teste2@intermediario.co.ao", "Teste12345!");
  check("Login comprador", !!cookie);

  // 1. Checkout subscrição PRO
  const ckRes = await fetch(`${BASE}/api/pagamentos/multicaixa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: BASE },
    body: JSON.stringify({ tipo: "PLANO", planoSlug: "pro" }),
  });
  const ck = await ckRes.json();
  check("Checkout plano PRO", ckRes.status === 201 && ck.referenceCode, ckRes.status);
  check("Payment criado PENDING", ck.status === "PENDING");

  // 2. Webhook SUCCESS com assinatura válida
  const payload = JSON.stringify({ referenceCode: ck.referenceCode, status: "SUCCESS", paidAmount: 15000, paidAt: new Date().toISOString() });
  const sig = await sign(payload, SECRET);
  const wbOk = await fetch(`${BASE}/api/pagamentos/multicaixa-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": sig },
    body: payload,
  });
  check("Webhook SUCCESS", wbOk.status === 200, wbOk.status);

  // 3. Verificações na BD
  const payment = await prisma.payment.findUnique({ where: { id: ck.paymentId }, include: { subscription: true } });
  check("Payment APPROVED", payment?.status === "APPROVED", payment?.status);
  const sub = payment?.subscription;
  check("Subscription ativa + 30 dias", !!sub && sub.isActive && sub.endDate > new Date()) ;
  const user = await prisma.user.findUnique({ where: { id: ck.userId ?? payment?.userId } });
  check("Utilizador role PRO", user && (user.role === "PRO" || user.role === "VERIFIED_SELLER"), user?.role);
  check("isVerified ativado (badge)", !!user?.isVerified);

  // 4. Idempotência: repetir webhook → 200 "já processado" sem alterar nada
  const wbIdem = await fetch(`${BASE}/api/pagamentos/multicaixa-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": sig },
    body: payload,
  });
  const idemBody = await wbIdem.json();
  check("Webhook repetido idempotente", wbIdem.status === 200 && idemBody.message === "Evento já processado", wbIdem.status);

  // 5. Assinatura inválida → 401
  const wbBad = await fetch(`${BASE}/api/pagamentos/multicaixa-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": "invalida" },
    body: payload,
  });
  check("Assinatura inválida → 401", wbBad.status === 401, wbBad.status);

  // 6. Destaque via MCX
  const seller = await prisma.user.findUnique({ where: { email: "autonorte@demo.co.ao" } });
  const listing = await prisma.listing.findFirst({ where: { userId: seller.id } });
  const pkg = await prisma.promotionPackage.findFirst({ where: { position: "CATEGORY_TOP", durationDays: 7 } });
  const listingSellerCookie = await login("autonorte@demo.co.ao", "Demo12345!");
  const ckD = await fetch(`${BASE}/api/pagamentos/multicaixa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: listingSellerCookie, Origin: BASE },
    body: JSON.stringify({ tipo: "DESTAQUE", pacoteId: pkg.id, listingId: listing.id }),
  });
  const d = await ckD.json();
  check("Checkout destaque", ckD.status === 201 && d.referenceCode, ckD.status);
  const payloadD = JSON.stringify({ referenceCode: d.referenceCode, status: "SUCCESS", paidAmount: 3500, paidAt: new Date().toISOString() });
  const wbD = await fetch(`${BASE}/api/pagamentos/multicaixa-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": sign(payloadD, SECRET) },
    body: payloadD,
  });
  const lp = await prisma.listingPromotion.findFirst({ where: { payments: { some: { id: d.paymentId } } }, include: { listing: true } });
  check("Webhook destaque SUCCESS", wbD.status === 200, wbD.status);
  check("ListingPromotion ativa", !!lp && lp.isActive && lp.endDate > new Date());
  check("Anúncio isFeatured (categoria)", !!lp?.listing.isFeatured && !!lp.listing.featuredUntil);

  // 7. Rejeitado
  const ckR = await fetch(`${BASE}/api/pagamentos/multicaixa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: BASE },
    body: JSON.stringify({ tipo: "PLANO", planoSlug: "enterprise" }),
  });
  const r = await ckR.json();
  const payloadR = JSON.stringify({ referenceCode: r.referenceCode, status: "FAILED", paidAt: new Date().toISOString() });
  const wbR = await fetch(`${BASE}/api/pagamentos/multicaixa-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": sign(payloadR, SECRET) },
    body: payloadR,
  });
  const payR = await prisma.payment.findUnique({ where: { id: r.paymentId } });
  check("Webhook rejeitado → payment REJECTED", wbR.status === 200 && payR?.status === "REJECTED", payR?.status);

  console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });