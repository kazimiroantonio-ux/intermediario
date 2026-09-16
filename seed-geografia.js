require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Lei n.º 14/24 — 21 províncias (ordem oficial do Diário da República)
const PROVINCES = [
  { code: "CAB", name: "Cabinda" },
  { code: "ZAE", name: "Zaire" },
  { code: "UIG", name: "Uíge" },
  { code: "BGO", name: "Bengo" },
  { code: "LDA", name: "Luanda" },
  { code: "IBO", name: "Icolo e Bengo" },
  { code: "CZN", name: "Cuanza-Norte" },
  { code: "CZS", name: "Cuanza-Sul" },
  { code: "MAL", name: "Malanje" },
  { code: "LNO", name: "Lunda-Norte" },
  { code: "LSU", name: "Lunda-Sul" },
  { code: "MOX", name: "Moxico" },
  { code: "MLE", name: "Moxico-Leste" },
  { code: "BIE", name: "Bié" },
  { code: "HUA", name: "Huambo" },
  { code: "BGE", name: "Benguela" },
  { code: "NAM", name: "Namibe" },
  { code: "CUB", name: "Cubango" },
  { code: "CUN", name: "Cunene" },
  { code: "HUI", name: "Huíla" },
  { code: "COU", name: "Cuando" },
];

// Lei n.º 8/25 — 16 municípios de Luanda (codes oficiais AOLDA05xxxx)
const LUANDA_MUNICIPALITIES = [
  { code: "AOLDA050100", name: "Ingombota", districts: [] },
  { code: "AOLDA050200", name: "Cacuaco", districts: [] },
  { code: "AOLDA050300", name: "Cazenga", districts: [] },
  { code: "AOLDA050400", name: "Viana", districts: ["Zango", "Estalagem", "Viana"] },
  { code: "AOLDA050500", name: "Belas", districts: ["Barra do Cuanza"] },
  { code: "AOLDA050600", name: "Kilamba Kiaxi", districts: ["Kilamba Kiaxi", "Nova Vida"] },
  { code: "AOLDA050700", name: "Talatona", districts: ["Benfica", "Talatona"] },
  { code: "AOLDA050800", name: "Mussulo", districts: [] },
  { code: "AOLDA050900", name: "Sambizanga", districts: [] },
  { code: "AOLDA051000", name: "Rangel", districts: [] },
  { code: "AOLDA051100", name: "Maianga", districts: [] },
  { code: "AOLDA051200", name: "Samba", districts: [] },
  { code: "AOLDA051300", name: "Camama", districts: [] },
  { code: "AOLDA051400", name: "Mulenvos", districts: [] },
  { code: "AOLDA051500", name: "Kilamba", districts: ["Kilamba", "Vila Flor"] },
  { code: "AOLDA051600", name: "Hoji ya Henda", districts: [] },
];

async function main() {
  const set = [];
  for (const p of PROVINCES) set.push(p.code);
  console.log("Províncias a carregar:", PROVINCES.length, "| Luanda-ativa");

  for (const p of PROVINCES) {
    await prisma.province.upsert({
      where: { code: p.code },
      update: { name: p.name, isActive: p.code === "LDA", launchOrder: p.code === "LDA" ? 1 : null },
      create: { code: p.code, name: p.name, isActive: p.code === "LDA", launchOrder: p.code === "LDA" ? 1 : null },
    });
    console.log("PROV", p.code, "OK");
  }

  const lda = await prisma.province.findUnique({ where: { code: "LDA" }, select: { id: true } });
  if (!lda) throw new Error("Província LDA não encontrada");

  for (const m of LUANDA_MUNICIPALITIES) {
    await prisma.municipality.upsert({
      where: { code: m.code },
      update: { name: m.name, provinceId: lda.id, isActive: true },
      create: { code: m.code, name: m.name, provinceId: lda.id, isActive: true },
    });
    console.log("MUNI", m.code, m.name, "OK");
  }

  // Districts = comunas / bairros relevantes
  for (const m of LUANDA_MUNICIPALITIES) {
    const muni = await prisma.municipality.findUnique({ where: { code: m.code }, select: { id: true } });
    if (!muni) continue;
    for (const dName of m.districts) {
      await prisma.district.upsert({
        where: { municipalityId_name: { municipalityId: muni.id, name: dName } },
        update: { isActive: true },
        create: { municipalityId: muni.id, name: dName, isActive: true },
      });
      console.log("DIST", m.name, "/", dName, "OK");
    }
  }

  const total = await prisma.province.count();
  const totalM = await prisma.municipality.count();
  const totalD = await prisma.district.count();
  console.log(`TOTAL: ${total} províncias · ${totalM} municípios · ${totalD} distritos`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());