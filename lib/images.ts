// Imagens reais (Unsplash – uso livre) organizadas por categoria.
const u = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const CATEGORY_IMAGES: Record<string, string[]> = {
  AUTOMOVEL: [
    u("photo-1494976388531-d1058494cdd8"),
    u("photo-1552519507-da3b142c6e3d"),
    u("photo-1542362567-b07e54358753"),
    u("photo-1555215695-3004980ad54e"),
    u("photo-1511919884226-fd3cad34687c"),
    u("photo-1503376780353-7e6692767b70"),
    u("photo-1533473359331-0135ef1b58bf"),
  ],
  MOTORIZADAS: [
    u("photo-1558981403-c5f9899a28bc"),
    u("photo-1568772585407-9361f9bf3a87"),
  ],
  IMOBILIARIO: [
    u("photo-1568605114967-8130f3a36994"),
    u("photo-1570129477492-45c003edd2be"),
    u("photo-1512917774080-9991f1c4c750"),
    u("photo-1522708323590-d24dbb6b0267"),
    u("photo-1560448204-e02f11c3d0e2"),
    u("photo-1493809842364-78817add7ffb"),
    u("photo-1484154218962-a197022b5858"),
    u("photo-1600596542815-ffad4c1539a9"),
    u("photo-1600585154340-be6161a56a0c"),
    u("photo-1502672260266-1c1ef2d93688"),
  ],
  TERRENO: [
    u("photo-1500382017468-9049fed747ef"),
    u("photo-1466692476868-aef1dfb1e735"),
    u("photo-1473448912268-2022ce9509d8"),
    u("photo-1501854140801-50d01698950b"),
  ],
  MAQUINAS: [
    u("photo-1504328345606-18bbc8c9d7d1"),
    u("photo-1541888946425-d81bb19240f5"),
    u("photo-1504307651254-35680f356dfd"),
    u("photo-1581094794329-c8112a89af12"),
  ],
  MOVEIS: [
    u("photo-1555041469-a586c61ea9bc"),
    u("photo-1586023492125-27b2c045efd7"),
    u("photo-1524758631624-e2822e304c36"),
    u("photo-1616486338812-3dadae4b4ace"),
    u("photo-1493663284031-b7e3aefcae8e"),
  ],
  OUTROS: [
    u("photo-1441986300917-64674bd600d8"),
    u("photo-1472851294608-062f824d29cc"),
  ],
};

export function fallbackImage(category: string): string {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.OUTROS;
  return pool[0];
}

export function pickImages(category: string, count = 3, offset = 0): string[] {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.OUTROS;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(offset + i) % pool.length]);
  return out;
}

export const HERO_SLIDES = [
  { image: u("photo-1494976388531-d1058494cdd8", 1600) },
  { image: u("photo-1568605114967-8130f3a36994", 1600) },
  { image: u("photo-1500382017468-9049fed747ef", 1600) },
];

export const BUSINESS_AVATARS = [
  u("photo-1560250097-0b93528c311a", 200),
  u("photo-1573496359142-b8d87734a5a2", 200),
  u("photo-1472099645785-5658abf4ff4e", 200),
  u("photo-1507003211169-0a1dd7228f2d", 200),
  u("photo-1438761681033-6461ffad8d80", 200),
];
