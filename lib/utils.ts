export type ListingCategory =
  | "AUTOMOVEL"
  | "MOTORIZADAS"
  | "IMOBILIARIO"
  | "TERRENO"
  | "MAQUINAS"
  | "MOVEIS"
  | "OUTROS";
export type DealType = "VENDA" | "ALUGUER";

export type CategoryInfo = {
  slug: ListingCategory;
  title: string;
  short: string;
  desc: string;
  icon: string;
  accent: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { slug: "AUTOMOVEL", title: "Automóveis & Veículos", short: "Carros", desc: "Carros, SUV, carrinhas e camiões", icon: "🚗", accent: "from-sky-500 to-blue-600" },
  { slug: "MOTORIZADAS", title: "Motorizadas", short: "Motorizadas", desc: "Motas, ciclomotores e quads", icon: "🏍", accent: "from-indigo-500 to-violet-600" },
  { slug: "IMOBILIARIO", title: "Imobiliário", short: "Imóveis", desc: "Casas, apartamentos e escritórios", icon: "🏠", accent: "from-emerald-500 to-teal-600" },
  { slug: "TERRENO", title: "Terrenos", short: "Terrenos", desc: "Construção, lotes e quintas", icon: "🌍", accent: "from-lime-500 to-green-600" },
  { slug: "MAQUINAS", title: "Máquinas & Equipamento", short: "Máquinas", desc: "Tratores, geradores e ferramentas", icon: "🚜", accent: "from-amber-500 to-orange-600" },
  { slug: "MOVEIS", title: "Móveis & Decoração", short: "Móveis", desc: "Salas, quartos e cozinhas", icon: "🪑", accent: "from-rose-500 to-pink-600" },
  { slug: "OUTROS", title: "Outros Bens", short: "Outros", desc: "Equipamento pesado, embarcações e mais", icon: "📦", accent: "from-stone-500 to-neutral-600" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.title])
);

export const CATEGORY_SHORT: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.short])
);

export const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.icon])
);

export const SUBCATEGORIES: Record<string, string[]> = {
  AUTOMOVEL: ["Carro", "SUV / 4x4", "Carrinha", "Camião", "Autocarro", "Clássico"],
  MOTORIZADAS: ["Mota", "Ciclomotor", "Quad", "Triciclo"],
  IMOBILIARIO: ["Apartamento", "Vivenda", "Moradia", "Escritório", "Loja", "Armazém", "Prédio"],
  TERRENO: ["Construção", "Agrícola", "Quinta", "Lote"],
  MAQUINAS: ["Trator", "Escavadora", "Gerador", "Compressor", "Empilhador", "Ferramentas"],
  MOVEIS: ["Salas", "Quartos", "Cozinhas", "Escritório", "Jardim", "Decoração"],
  OUTROS: ["Equipamento pesado", "Embarcação", "Animal", "Material", "Outro"],
};

export type AttributeField = { key: string; label: string; options?: string[]; searchable?: boolean };

export const ATTRIBUTE_FIELDS: Record<string, AttributeField[]> = {
  AUTOMOVEL: [
    { key: "marca", label: "Marca", searchable: true },
    { key: "modelo", label: "Modelo", searchable: true },
    { key: "ano", label: "Ano", searchable: true },
    { key: "quilometragem", label: "Quilometragem" },
    { key: "combustivel", label: "Combustível", options: ["Gasolina", "Gasóleo", "Elétrico", "Híbrido", "GPL"], searchable: true },
    { key: "transmissao", label: "Transmissão", options: ["Automática", "Manual"], searchable: true },
    { key: "motor", label: "Motor" },
    { key: "tracao", label: "Tração", options: ["2x4", "4x4", "AWD"], searchable: true },
    { key: "lugares", label: "Nº de lugares" },
    { key: "cor", label: "Cor", searchable: true },
    { key: "estado", label: "Estado", options: ["Novo", "Usado", "Importado"], searchable: true },
  ],
  MOTORIZADAS: [
    { key: "marca", label: "Marca", searchable: true },
    { key: "modelo", label: "Modelo", searchable: true },
    { key: "ano", label: "Ano", searchable: true },
    { key: "cilindrada", label: "Cilindrada (cc)" },
    { key: "quilometragem", label: "Quilometragem" },
    { key: "estado", label: "Estado", options: ["Novo", "Usado"], searchable: true },
  ],
  IMOBILIARIO: [
    { key: "tipologia", label: "Tipologia", options: ["T0", "T1", "T2", "T3", "T4", "T5+", "Vivenda", "Escritório"], searchable: true },
    { key: "area_m2", label: "Área (m²)", searchable: true },
    { key: "quartos", label: "Quartos", searchable: true },
    { key: "casas_de_banho", label: "Casas de banho" },
    { key: "garagem", label: "Garagem", options: ["Sim", "Não"], searchable: true },
    { key: "piscina", label: "Piscina", options: ["Sim", "Não"], searchable: true },
    { key: "mobiliado", label: "Mobilado", options: ["Sim", "Não", "Parcial"], searchable: true },
    { key: "estado", label: "Estado", options: ["Novo", "Usado", "Em construção"], searchable: true },
  ],
  TERRENO: [
    { key: "area_m2", label: "Área (m²)", searchable: true },
    { key: "tipo_terreno", label: "Tipo de terreno", options: ["Construção", "Agrícola", "Quinta", "Lote"], searchable: true },
    { key: "documentacao", label: "Documentação", options: ["Escritura", "Carta de Intenção", "Direito de Superfície", "Em processo"], searchable: true },
    { key: "zona", label: "Zona", searchable: true },
  ],
  MAQUINAS: [
    { key: "marca", label: "Marca", searchable: true },
    { key: "modelo", label: "Modelo", searchable: true },
    { key: "ano", label: "Ano", searchable: true },
    { key: "estado", label: "Estado", options: ["Novo", "Usado"], searchable: true },
  ],
  MOVEIS: [
    { key: "material", label: "Material", searchable: true },
    { key: "estado", label: "Estado", options: ["Novo", "Usado"], searchable: true },
  ],
  OUTROS: [
    { key: "estado", label: "Estado", options: ["Novo", "Usado"], searchable: true },
    { key: "tipo", label: "Tipo", options: ["Equipamento pesado", "Embarcação", "Máquina", "Material", "Outro"], searchable: true },
  ],
};

export const SEARCHABLE_FIELDS: Record<string, AttributeField[]> = Object.fromEntries(
  Object.entries(ATTRIBUTE_FIELDS).map(([cat, fields]) => [
    cat,
    fields.filter((f) => f.searchable),
  ])
);

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  VENDA: "Venda",
  ALUGUER: "Aluguer",
};

// Lei n.º 14/24 (5 de Setembro) — Angola passou de 18 para 21 províncias.
// Sem projeção para SUPABASE ainda: este é o espelho estático dos forms/UI.
// Fonte canónica na BD: tabela `provinces` (seed-geografia.js).
export const PROVINCES = [
  "Cabinda", "Zaire", "Uíge", "Bengo", "Luanda", "Icolo e Bengo", "Cuanza-Norte",
  "Cuanza-Sul", "Malanje", "Lunda-Norte", "Lunda-Sul", "Moxico", "Moxico-Leste",
  "Bié", "Huambo", "Benguela", "Namibe", "Cubango", "Cunene", "Huíla", "Cuando",
];

// Municípios de Luanda pós-Lei 8/25 (16) — alinhado com seed-geografia.js.
export const LUANDA_MUNICIPALITIES = [
  "Ingombota", "Cacuaco", "Cazenga", "Viana", "Belas", "Kilamba Kiaxi", "Talatona",
  "Mussulo", "Sambizanga", "Rangel", "Maianga", "Samba", "Camama", "Mulenvos",
  "Kilamba", "Hoji ya Henda",
];

export const PLANS = [
  {
    id: "BASICO",
    name: "Grátis",
    price: 0,
    features: ["Anúncios ilimitados", "Chat com compradores", "Reservas para aluguer", "Estatísticas básicas"],
  },
  {
    id: "PRO",
    name: "Profissional",
    price: 15000,
    features: ["1 destaque de anúncio por mês", "Selo de vendedor verificado", "Estatísticas avançadas", "Suporte prioritário", "Histórico de preços"],
  },
  {
    id: "EMPRESA",
    name: "Empresa",
    price: 50000,
    features: ["10 destaques por mês", "Selo de empresa verificada", "API para parceiros", "Gestor de conta dedicado", "Relatórios financeiros", "Múltiplos utilizadores"],
  },
];

export const PRICING = {
  DESTAQUE: 5000 as const,
  VERIFICACAO_PESSOAL: 2500 as const,
  VERIFICACAO_EMPRESA: 5000 as const,
  COMISSAO_RATE: 0.1 as const, // 10% do valor do negócio
  COMISSAO_MIN: 1000 as const,
  AGENT_SHARE_RATE: 0.5 as const, // 50% da comissão para o agente
  BANNER: {
    HERO: 40000 as const,
    HOME_MID: 25000 as const,
    LISTING_TOP: 15000 as const,
  },
  FLASH: 5000 as const,
} as const;

export const COMMISSION_RATE = 0.1; // 10%
export const COMMISSION_MIN = 1000;
export const AGENT_SHARE_RATE = 0.5; // 50% da comissão do site para o agente

export function formatKwanza(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "AOA 0";
  return "AOA " + new Intl.NumberFormat("pt-AO", {
    maximumFractionDigits: 0,
  }).format(num);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "segundo"],
    [3600, "minuto"],
    [86400, "hora"],
    [604800, "dia"],
    [2592000, "semana"],
  ];
  if (seconds < 60) return "agora mesmo";
  for (const [secs, label] of units) {
    const count = Math.floor(seconds / secs);
    if (count < 60 && count > 0) {
      const singular = label.replace(/s$/, "");
      const display = count === 1 ? singular : label;
      return `há ${count} ${display}`;
    }
  }
  return "há muito tempo";
}
