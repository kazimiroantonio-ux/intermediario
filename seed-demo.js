require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const BASE = process.env.SEED_BASE_URL || "http://localhost:3000";

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const IMG = {
  AUTOMOVEL: ["photo-1494976388531-d1058494cdd8", "photo-1552519507-da3b142c6e3d", "photo-1542362567-b07e54358753", "photo-1555215695-3004980ad54e", "photo-1511919884226-fd3cad34687c", "photo-1503376780353-7e6692767b70"],
  MOTORIZADAS: ["photo-1558981403-c5f9899a28bc", "photo-1568772585407-9361f9bf3a87"],
  IMOBILIARIO: ["photo-1568605114967-8130f3a36994", "photo-1570129477492-45c003edd2be", "photo-1512917774080-9991f1c4c750", "photo-1522708323590-d24dbb6b0267", "photo-1560448204-e02f11c3d0e2", "photo-1493809842364-78817add7ffb", "photo-1484154218962-a197022b5858", "photo-1600596542815-ffad4c1539a9"],
  TERRENO: ["photo-1500382017468-9049fed747ef", "photo-1466692476868-aef1dfb1e735", "photo-1473448912268-2022ce9509d8", "photo-1501854140801-50d01698950b"],
  MAQUINAS: ["photo-1504328345606-18bbc8c9d7d1", "photo-1541888946425-d81bb19240f5", "photo-1504307651254-35680f356dfd", "photo-1581094794329-c8112a89af12"],
  ELETRONICOS: ["photo-1511707171634-5f897ff02aa9", "photo-1510557880182-3d4d3cba35a5", "photo-1505740420928-5e560c06d30e", "photo-1546868871-7041f2a55e12"],
  COMPUTADORES: ["photo-1517336714731-489689fd1ca8", "photo-1496181133206-80ce9b88a853", "photo-1547394765-185e1e68f34e", "photo-1587831990711-23ca6441447b"],
  MOVEIS: ["photo-1555041469-a586c61ea9bc", "photo-1586023492125-27b2c045efd7", "photo-1524758631624-e2822e304c36", "photo-1616486338812-3dadae4b4ace"],
  MODA: ["photo-1542291026-7eec264c27ff", "photo-1549298916-b41d501d3772", "photo-1521572163474-6864f9cf17ab", "photo-1434389677669-e08b4cac3105"],
  SERVICOS: ["photo-1556742049-0cfed4f6a45d", "photo-1581092160562-40aa08e78837", "photo-1486262715619-67b85e0b08d3"],
};

const BUSINESSES = [
  { key: "autonorte", name: "AutoNorte Concessionária", email: "autonorte@demo.co.ao", bio: "Concessionária de viaturas novas e usadas certificadas em Luanda. Garantia de 12 meses em todos os veículos.", province: "Luanda", avatar: "photo-1560250097-0b93528c311a" },
  { key: "luandasul", name: "Imobiliária Luanda Sul", email: "luandasul@demo.co.ao", bio: "Especialistas na venda e arrendamento de imóveis de luxo em Talatona, Miramar e Ilha de Luanda.", province: "Luanda", avatar: "photo-1573496359142-b8d87734a5a2" },
  { key: "techluanda", name: "TechLuanda Store", email: "techluanda@demo.co.ao", bio: "Loja de telemóveis, computadores e eletrónica original com garantia. Envio para todo o país.", province: "Luanda", avatar: "photo-1472099645785-5658abf4ff4e" },
  { key: "agrofuturo", name: "AgroFuturo Equipamentos", email: "agrofuturo@demo.co.ao", bio: "Tractores, geradores e maquinaria agrícola e industrial com assistência técnica própria.", province: "Huambo", avatar: "photo-1507003211169-0a1dd7228f2d" },
  { key: "casaestilo", name: "Casa & Estilo Móveis", email: "casaestilo@demo.co.ao", bio: "Mobiliário moderno e decoração para a sua casa. Entrega e montagem incluídas.", province: "Benguela", avatar: "photo-1438761681033-6461ffad8d80" },
];

const LISTINGS = [
  { ownerKey: "autonorte", title: "Toyota Hilux 2.8 GD-6 4x4 2022", price: 38500000, category: "AUTOMOVEL", subcategory: "Camião", dealType: "VENDA", province: "Luanda", municipality: "Belas", featured: true, views: 1243, daysAgo: 1,
    description: "Toyota Hilux 2022 nacional, livro de revisões completo na Toyota, garantia de fábrica até 2027. Caixa automática de 6 velocidades, 4x4, jantes em liga leve, sensores de estacionamento e câmara traseira.",
    attrs: { marca: "Toyota", modelo: "Hilux", ano: "2022", quilometragem: "45000", combustivel: "Gasóleo", transmissao: "Automática", tracao: "4x4", cor: "Prata" }, imgIdx: [0, 3] },
  { ownerKey: "autonorte", title: "Hyundai Tucson 1.6 T-GDi 2020", price: 24900000, category: "AUTOMOVEL", subcategory: "SUV / 4x4", dealType: "VENDA", province: "Luanda", municipality: "Viana", views: 512, daysAgo: 3,
    description: "Hyundai Tucson 2020 importado da Europa, apenas 62 mil km. Interior em pele, teto panorâmico, Apple CarPlay e Android Auto. Documentação em ordem e pronto a levantar.",
    attrs: { marca: "Hyundai", modelo: "Tucson", ano: "2020", quilometragem: "62000", combustivel: "Gasolina", transmissao: "Automática", cor: "Branco" }, imgIdx: [2, 4] },
  { ownerKey: "autonorte", title: "BMW X3 xDrive20i Pack M 2021", price: 42000000, category: "AUTOMOVEL", subcategory: "SUV / 4x4", dealType: "VENDA", province: "Luanda", municipality: "Ingombota", featured: true, views: 891, daysAgo: 2,
    description: "BMW X3 Pack M com apenas 30 mil km, como novo. Faróis laser, bancos desportivos em pele Vernasca, head-up display. Aceitamos retoma e financiamos em até 36 meses.",
    attrs: { marca: "BMW", modelo: "X3", ano: "2021", quilometragem: "30000", combustivel: "Gasolina", transmissao: "Automática", tracao: "AWD", cor: "Preto" }, imgIdx: [3, 5] },
  { ownerKey: "autonorte", title: "Toyota Hilux com motorista (aluguer diário)", price: 85000, category: "AUTOMOVEL", subcategory: "SUV / 4x4", dealType: "ALUGUER", province: "Luanda", municipality: "Belas", views: 214, daysAgo: 5,
    description: "Aluguer de Hilux 4x4 com motorista profissional incluído. Ideal para projectos, prospecção e deslocações ao interior do país. Preço por dia, combustível não incluído.",
    attrs: { marca: "Toyota", modelo: "Hilux", ano: "2019", combustivel: "Diesel", transmissao: "Manual", tracao: "4x4", estado: "Usado" }, imgIdx: [0, 1] },
  { ownerKey: "autonorte", title: "Honda CB 500F 2022", price: 1850000, category: "MOTORIZADAS", subcategory: "Mota", dealType: "VENDA", province: "Luanda", municipality: "Belas", views: 187, daysAgo: 6,
    description: "Honda CB 500F quase nova, apenas 8 mil km. Ideal para cidade e estrada, consumo baixo. Com capacete origina Honda incluído e documentos tratados.",
    attrs: { marca: "Honda", modelo: "CB 500F", ano: "2022", cilindrada: "500", quilometragem: "8000", estado: "Usado" }, imgIdx: [0] },
  { ownerKey: "luandasul", title: "Apartamento T3 com vista mar — Talatona", price: 95000000, category: "IMOBILIARIO", subcategory: "Apartamento", dealType: "VENDA", province: "Luanda", municipality: "Talatona", featured: true, views: 2103, daysAgo: 1,
    description: "Exclusivo apartamento T3 no coração de Talatona com vista mar panorâmica. Condomínio fechado com segurança 24h, piscina, ginásio e gerador de backup. Cozinha equipada e roupeiros embutidos.",
    attrs: { tipologia: "T3", area_m2: "140", quartos: "3", casas_de_banho: "2", garagem: "Sim", piscina: "Sim", mobiliado: "Não", estado: "Novo" }, imgIdx: [3, 4] },
  { ownerKey: "luandasul", title: "Vivenda V4 murada — Cassenda (Talatona)", price: 165000000, category: "IMOBILIARIO", subcategory: "Vivenda", dealType: "VENDA", province: "Luanda", municipality: "Talatona", views: 1678, daysAgo: 4,
    description: "Magnífica vivenda V4 individual em condomínio privado na Cassenda. Jardim tratado, piscina privativa, anexo para pessoal de apoio e garagem para 4 viaturas. Escritura e alvará em ordem.",
    attrs: { tipologia: "Vivenda", area_m2: "450", quartos: "4", casas_de_banho: "5", garagem: "Sim", piscina: "Sim", mobiliado: "Parcial", estado: "Usado" }, imgIdx: [0, 7] },
  { ownerKey: "luandasul", title: "Apartamento T2 mobilado — Maianga (aluguer mensal)", price: 450000, category: "IMOBILIARIO", subcategory: "Apartamento", dealType: "ALUGUER", province: "Luanda", municipality: "Ingombota", views: 956, daysAgo: 3,
    description: "T2 totalmente mobilado e equipado no Maianga, pronto a habitar. Inclui água quente, ar condicionado nos dois quartos, TV por satélite e internet. Rende mensal, 2 meses de caução.",
    attrs: { tipologia: "T2", area_m2: "85", quartos: "2", casas_de_banho: "1", mobiliado: "Sim", estado: "Usado" }, imgIdx: [5, 6] },
  { ownerKey: "luandasul", title: "Escritório 80 m² no centro de Luanda", price: 850000, category: "IMOBILIARIO", subcategory: "Escritório", dealType: "ALUGUER", province: "Luanda", municipality: "Ingombota", views: 344, daysAgo: 8,
    description: "Escritório amplo e luminoso num edifício comercial com elevadores e gerador. Ideal para escritórios de advocacia, consultoria ou agências. Arrendamento mínimo de 12 meses.",
    attrs: { tipologia: "Escritório", area_m2: "80", garagem: "Não", estado: "Usado" }, imgIdx: [2] },
  { ownerKey: "luandasul", title: "Terreno murado 800 m² — Viana (Kikolo)", price: 22000000, category: "TERRENO", subcategory: "Construção", dealType: "VENDA", province: "Luanda", municipality: "Viana", views: 687, daysAgo: 7,
    description: "Terreno plano já murado com portão de acesso, localização excelente perto da via expresso. Documentação legalizada com carta de intenção convertida. Pronto para construção.",
    attrs: { area_m2: "800", tipo_terreno: "Construção", documentacao: "Carta de Intenção", zona: "Kikolo" }, imgIdx: [0, 1] },
  { ownerKey: "luandasul", title: "Fazenda 12 hectares com furo de água — Caxito", price: 95000000, category: "TERRENO", subcategory: "Quinta", dealType: "VENDA", province: "Bengo", municipality: "Dande", views: 431, daysAgo: 10,
    description: "Fazenda com 12 hectares em Caxito a 60 km de Luanda, com furo de água artesiano, casa de guarda e área cultivável. Excelente para agricultura mecanizada ou pecuária.",
    attrs: { area_m2: "120000", tipo_terreno: "Agrícola", documentacao: "Direito de Superfície", zona: "Caxito" }, imgIdx: [2, 3] },
  { ownerKey: "agrofuturo", title: "Tractor Massey Ferguson 4710 4x4 (novo)", price: 28500000, category: "MAQUINAS", subcategory: "Tractor", dealType: "VENDA", province: "Huambo", municipality: "Caála", featured: false, views: 298, daysAgo: 2,
    description: "Tractor Massey Ferguson 4710 novo, 4x4, com garantia de 2 anos e assistência técnica em todas as províncias. Inclui formação básica de operação para o seu pessoal.",
    attrs: { marca: "Massey Ferguson", modelo: "4710", ano: "2024", estado: "Novo" }, imgIdx: [0] },
  { ownerKey: "agrofuturo", title: "Gerador Cummins 100 kVA trifásico", price: 6900000, category: "MAQUINAS", subcategory: "Gerador", dealType: "VENDA", province: "Luanda", municipality: "Cacuaco", views: 512, daysAgo: 5,
    description: "Gerador Cummins 100 kVA novo em stock, trifásico, com quadro automático de arranque opcional. Consumo eficiente e peças disponíveis em Angola. Instalação disponível sob orçamento.",
    attrs: { marca: "Cummins", modelo: "C100 D5", ano: "2024", estado: "Novo" }, imgIdx: [1] },
  { ownerKey: "agrofuturo", title: "Escavadora CAT 320D 2018", price: 145000000, category: "MAQUINAS", subcategory: "Escavadora", dealType: "VENDA", province: "Luanda", municipality: "Viana", featured: true, views: 1104, daysAgo: 6,
    description: "Escavadora Caterpillar 320D 2018 importada, motor e braço em excelente estado, 9.500 horas de trabalho. Inclui dois baldes. Documentação de importação tratada.",
    attrs: { marca: "Caterpillar", modelo: "320D", ano: "2018", estado: "Usado" }, imgIdx: [2, 3] },
  { ownerKey: "techluanda", title: "iPhone 14 Pro Max 256 GB — selado", price: 1250000, category: "ELETRONICOS", subcategory: "Telemóveis", dealType: "VENDA", province: "Luanda", municipality: "Ingombota", views: 1876, daysAgo: 1,
    description: "iPhone 14 Pro Max 256GB novo e selado de fábrica, versão americana. Desbloqueado para todas as operadoras. Garantia de loja de 6 meses. Entregas em Luanda e envios para províncias.",
    attrs: { marca: "Apple", modelo: "iPhone 14 Pro Max", estado: "Novo" }, imgIdx: [0, 1] },
  { ownerKey: "techluanda", title: "Samsung Galaxy S23 Ultra 512 GB", price: 1180000, category: "ELETRONICOS", subcategory: "Telemóveis", dealType: "VENDA", province: "Luanda", municipality: "Ingombota", views: 943, daysAgo: 4,
    description: "Galaxy S23 Ultra 512GB com S Pen incluída. Câmera de 200 MP, bateria de 5000 mAh. Novo e selado com garantia de 12 meses Samsung. Várias cores disponíveis.",
    attrs: { marca: "Samsung", modelo: "Galaxy S23 Ultra", estado: "Novo" }, imgIdx: [1] },
  { ownerKey: "techluanda", title: "MacBook Air M2 2022 — 8/256 GB", price: 1680000, category: "COMPUTADORES", subcategory: "Portáteis", dealType: "VENDA", province: "Luanda", municipality: "Ingombota", views: 765, daysAgo: 3,
    description: "MacBook Air M2 selado, chip Apple M2, 8 GB RAM unificada e SSD de 256 GB. Autonomia até 18 horas, peso apenas 1,24 kg. Ideal para estudantes e profissionais.",
    attrs: { marca: "Apple", modelo: "MacBook Air M2", ram: "8", disco: "SSD 256 GB", estado: "Novo" }, imgIdx: [0, 1] },
  { ownerKey: "techluanda", title: "PC Gamer Ryzen 7 + RTX 4070 12 GB", price: 2350000, category: "COMPUTADORES", subcategory: "Desktop", dealType: "VENDA", province: "Luanda", municipality: "Rangel", views: 620, daysAgo: 9,
    description: "Computador gamer montado e testado: Ryzen 7 5800X, RTX 4070 12GB, 32GB RAM 3600MHz, SSD NVMe 1TB, fonte 750W 80+ Gold. Corre qualquer jogo em Full HD/1440p no ultra.",
    attrs: { marca: "Custom Build", ram: "32", disco: "SSD NVMe 1 TB", estado: "Novo" }, imgIdx: [3] },
  { ownerKey: "casaestilo", title: "Sofá de canto 7 lugares em veludo", price: 780000, category: "MOVEIS", subcategory: "Salas", dealType: "VENDA", province: "Benguela", municipality: "Lobito", views: 402, daysAgo: 2,
    description: "Sofá de canto generoso em veludo premium com pés em madeira maciça. Espuma de alta densidade, muito confortável. Disponível em cinza, verde e azul. Montagem incluída no Lobito e Benguela.",
    attrs: { material: "Veludo / madeira", estado: "Novo" }, imgIdx: [0, 3] },
  { ownerKey: "casaestilo", title: "Roupeiro casal 4 portas espelhado", price: 320000, category: "MOVEIS", subcategory: "Quartos", dealType: "VENDA", province: "Benguela", municipality: "Lobito", views: 233, daysAgo: 7,
    description: "Roupeiro de casal com 4 portas corrediças, duas delas espelhadas. Interior com varões, prateleiras ajustáveis e gavetas. MDF de alta resistência. Entregamos em toda a província.",
    attrs: { material: "MDF", estado: "Novo" }, imgIdx: [1] },
  { ownerKey: "casaestilo", title: "Ténis Nike Air Force 1 '07 (original)", price: 145000, category: "MODA", subcategory: "Calçado", dealType: "VENDA", province: "Benguela", municipality: "Benguela", views: 588, daysAgo: 2,
    description: "Nike Air Force 1 '07 100% originais, trazidos dos EUA. Todos os tamanhos do 38 ao 45. Verificação de autenticidade permitida antes da compra.",
    attrs: { marca: "Nike", tamanho: "38 ao 45", estado: "Novo com etiqueta" }, imgIdx: [0, 1] },
];

async function signupWithRetry(payload, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      console.log("  limite de pedidos, aguardando 20s...");
      await new Promise((r) => setTimeout(r, 20000));
      continue;
    }
    return res;
  }
  throw new Error("signup: demasiadas tentativas com limite de pedidos");
}

async function ensureBusiness(b) {
  const res = await signupWithRetry({ name: b.name, email: b.email, password: "Demo12345!" });
  if (res.ok) console.log(`  conta criada: ${b.email}`);
  else {
    const body = await res.json().catch(() => ({}));
    if (String(body.code).includes("USER_ALREADY_EXISTS") || res.status === 422) {
      console.log(`  já existe: ${b.email}`);
    } else throw new Error(`signup ${b.email}: ${res.status} ${JSON.stringify(body)}`);
  }
  const user = await prisma.user.update({
    where: { email: b.email },
    data: {
      role: "VERIFIED_SELLER",
      isVerified: true,
      companyName: b.name,
      bio: b.bio,
      province: b.province,
      image: u(b.avatar).replace("w=800", "w=200"),
    },
  });
  return user;
}

(async () => {
  const ids = {};
  for (const b of BUSINESSES) {
    const user = await ensureBusiness(b);
    ids[b.key] = user.id;
  }

  let created = 0;
  let skipped = 0;
  for (const l of LISTINGS) {
    const exists = await prisma.listing.findFirst({ where: { title: l.title }, select: { id: true } });
    if (exists) { skipped++; continue; }
    const images = l.imgIdx.map((i) => u(IMG[l.category][i % IMG[l.category].length]));
    await prisma.listing.create({
      data: {
        userId: ids[l.ownerKey],
        title: l.title,
        description: l.description,
        price: l.price,
        category: l.category,
        subcategory: l.subcategory,
        dealType: l.dealType,
        status: "ACTIVE",
        isFeatured: !!l.featured,
        featuredUntil: l.featured ? new Date(Date.now() + 30 * 864e5) : null,
        province: l.province,
        municipality: l.municipality,
        views: l.views ?? Math.floor(Math.random() * 400),
        publishedAt: new Date(Date.now() - (l.daysAgo ?? 1) * 864e5),
        images,
        attributes: l.attrs,
      },
    });
    created++;
  }
  console.log(`anúncios criados: ${created}, ignorados (já existiam): ${skipped}`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
