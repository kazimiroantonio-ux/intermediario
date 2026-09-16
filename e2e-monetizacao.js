require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const BASE = "http://localhost:3000";

let results = [];
function check(name, ok, extra) {
  results.push({ name, ok, extra: extra || "" });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${extra ? " | " + extra : ""}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0].trim());
  const cookieHeader = cookies.join("; ");
  return { cookieHeader, status: res.status };
}

(async () => {
  // 1. Homepage
  const home = await fetch(`${BASE}/`);
  check("Homepage 200", home.status === 200, `status=${home.status}`);

  // 2. Login admin + seller (teste2 owns listings? teste2 is a normal user)
  const admin = await login("admin3@intermediario.co.ao", "Admin12345!");
  check("Admin login", admin.cookieHeader.length > 0, `status=${admin.status}`);
  const seller = await login("autonorte@demo.co.ao", "Demo12345!");
  check("Seller login (autonorte)", seller.cookieHeader.length > 0);
  const buyer = await login("teste2@intermediario.co.ao", "Teste12345!");
  check("Buyer login (teste2)", buyer.cookieHeader.length > 0);

  // 3. Find an ALUGUER listing owned by autonorte for reservation test
  const listing = await prisma.listing.findFirst({
    where: { dealType: "ALUGUER", userId: (await prisma.user.findUnique({ where: { email: "autonorte@demo.co.ao" } })).id, status: "ACTIVE" },
    select: { id: true },
  });
  check("ALUGUER listing found", !!listing, listing?.id);

  if (listing) {
    // 4. Buyer creates reservation
    const start = new Date(); start.setDate(start.getDate() + 10);
    const end = new Date(); end.setDate(end.getDate() + 13);
    const resv = await fetch(`${BASE}/api/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE, Cookie: buyer.cookieHeader },
      body: JSON.stringify({ listingId: listing.id, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }),
    });
    const resvData = await resv.json();
    const reservationId = resvData.reservation?.id;
    check("Reservation created", resv.status === 201, `status=${resv.status}, id=${reservationId ?? "none"}`);

    // 5. Seller confirms → commission created
    const confirm = await fetch(`${BASE}/api/reservas/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
      body: JSON.stringify({ action: "CONFIRMAR" }),
    });
    const confirmData = await confirm.json();
    check("Reservation confirmed", confirm.status === 200 && confirmData.reservation?.status === "CONFIRMED", `status=${confirm.status}`);

    const commission = await prisma.commissionLedger.findFirst({ where: { reservationId } });
    check("Commission ledger created", !!commission, commission ? `amount=${commission.amount}` : "");
    const commissionTxn = await prisma.transaction.findFirst({ where: { type: "COMISSAO", userId: (await prisma.user.findUnique({ where: { email: "autonorte@demo.co.ao" } })).id } });
    check("Commission transaction created", !!commissionTxn, commissionTxn ? `type=${commissionTxn.type} amount=${commissionTxn.amount}` : "");
  }

  // 6. Seller requests verification (EMPRESA)
  const verify = await fetch(`${BASE}/api/verificacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
    body: JSON.stringify({ tipo: "EMPRESA" }),
  });
  const verifyData = await verify.json();
  check("Verification request created", verify.status === 201, `status=${verify.status}`);
  const verifyTxn = await prisma.transaction.findFirst({ where: { type: "VERIFICACAO", userId: (await prisma.user.findUnique({ where: { email: "autonorte@demo.co.ao" } })).id } });
  check("Verification transaction created", !!verifyTxn, verifyTxn ? `amount=${verifyTxn.amount}` : "");

  // 7. Admin approves verification
  const vreq = await prisma.verificationRequest.findFirst({ orderBy: { createdAt: "desc" } });
  const approve = await fetch(`${BASE}/api/admin/verificacoes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: admin.cookieHeader },
    body: JSON.stringify({ id: vreq.id, action: "APROVAR" }),
  });
  check("Admin approves verification", approve.status === 200, `status=${approve.status}`);
  const userAfter = await prisma.user.findUnique({ where: { email: "autonorte@demo.co.ao" }, select: { isVerified: true } });
  check("User isVerified after approval", userAfter.isVerified === true);

  // 8. Merchant buys banner (HERO)
  const banner = await fetch(`${BASE}/api/banners`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
    body: JSON.stringify({ title: "AutoNorte Test", imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800", linkUrl: "https://example.ao", position: "HERO" }),
  });
  const bannerData = await banner.json();
  check("Banner purchased", banner.status === 201, `status=${banner.status}`);
  const bannerTxn = await prisma.transaction.findFirst({ where: { type: "BANNER" } });
  check("Banner transaction created", !!bannerTxn, bannerTxn ? `amount=${bannerTxn.amount}` : "");

  // 9. GET banners (public)
  const bannersRes = await fetch(`${BASE}/api/banners?position=HERO`);
  const bannersData = await bannersRes.json();
  check("Public banners endpoint works", bannersRes.status === 200 && (bannersData.banners?.length ?? 0) >= 1, `count=${bannersData.banners?.length ?? 0}`);

  // 10. Banner impression + click tracking
  const imp = await fetch(`${BASE}/api/banners/impressions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ id: bannerData.banner?.id }),
  });
  check("Banner impression tracked", imp.status === 200, `status=${imp.status}`);
  const click = await fetch(`${BASE}/api/banners`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
    body: JSON.stringify({ id: bannerData.banner?.id, action: "CLIQUE" }),
  });
  check("Banner click tracked", click.status === 200, `status=${click.status}`);

  // 11. Flash promotion
  const flash = await fetch(`${BASE}/api/flash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
    body: JSON.stringify({ listingId: listing?.id ?? "", title: "Oferta relâmpago de teste", targetProvince: undefined }),
  });
  const flashData = await flash.json();
  check("Flash promotion sent", flash.status === 201, `status=${flash.status}, sent=${flashData.sentCount ?? 0}`);
  const flashTxn = await prisma.transaction.findFirst({ where: { type: "FLASH" } });
  check("Flash transaction created", !!flashTxn, flashTxn ? `amount=${flashTxn.amount}` : "");

  // 12. Password attempt for second flash within the week → 429
  const flash2 = await fetch(`${BASE}/api/flash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: seller.cookieHeader },
    body: JSON.stringify({ listingId: listing?.id ?? "", title: "Segunda promoção" }),
  });
  check("Flash weekly limit enforced", flash2.status === 429, `status=${flash2.status}`);

  // Summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== RESUMO: ${results.length - failed.length}/${results.length} PASSED ===`);
  if (failed.length) {
    failed.forEach((f) => console.log(`FAIL: ${f.name}`));
    process.exitCode = 1;
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});