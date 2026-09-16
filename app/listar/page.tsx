import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serializeListings } from "@/lib/listings";
import { ListingCard } from "@/components/ListingCard";
import { ListingFilters } from "@/components/ListingFilters";
import { CATEGORY_LABELS } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explorar anúncios",
  description: "Explore automóveis, imóveis, terrenos e outros bens à venda e aluguer em Angola.",
};

export const dynamic = "force-dynamic";

const RESERVED_PARAMS = new Set(["categoria", "subcategoria", "tipo", "provincia", "municipio", "min", "max", "q", "destaque", "ordem"]);

export default async function ListarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const get = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]) ?? "";

  const categoria = get("categoria");
  const subcategoria = get("subcategoria");
  const tipo = get("tipo");
  const provincia = get("provincia");
  const q = get("q");
  const min = get("min");
  const max = get("max");
  const destaque = get("destaque");
  const ordem = get("ordem");

  const attrFilters: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_PARAMS.has(key)) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) attrFilters.push({ key, value: v });
  }

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (categoria) where.category = categoria;
  if (subcategoria) where.subcategory = subcategoria;
  if (tipo) where.dealType = tipo;
  if (destaque === "1") where.isFeatured = true;
  if (provincia) where.province = { contains: provincia, mode: "insensitive" };
  if (attrFilters.length > 0) {
    where.AND = attrFilters.map((f) => ({
      attributes: { path: [f.key], equals: f.value },
    }));
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { attributes: { string_contains: q } },
    ];
  }
  if (min || max) {
    where.price = {
      ...(min ? { gte: Number(min) } : {}),
      ...(max ? { lte: Number(max) } : {}),
    };
  }

  let orderBy;
  switch (ordem) {
    case "preco_asc":
      orderBy = [{ price: "asc" as const }];
      break;
    case "preco_desc":
      orderBy = [{ price: "desc" as const }];
      break;
    case "visualizacoes":
      orderBy = [{ views: "desc" as const }, { publishedAt: "desc" as const }];
      break;
    default:
      orderBy = [{ isFeatured: "desc" as const }, { publishedAt: "desc" as const }];
  }

  const listings = await prisma.listing.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, isVerified: true, companyName: true } },
    },
    orderBy,
    take: 60,
  });

  const total = await prisma.listing.count({ where });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        {categoria && CATEGORY_LABELS[categoria]
          ? CATEGORY_LABELS[categoria]
          : "Todos os anúncios"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total} anúncio{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
        {destaque === "1" && " em destaque"}
      </p>

      <div className="mt-6">
        <ListingFilters
          initial={{
            categoria,
            subcategoria,
            tipo,
            provincia,
            municipio: "",
            min,
            max,
            q,
            destaque: destaque === "1",
            ordem,
          }}
        />
      </div>

      {listings.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {serializeListings(listings).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Nenhum anúncio encontrado</p>
          <p className="mt-2 text-sm text-zinc-500">
            Tente ajustar os filtros ou publicar o seu próprio anúncio.
          </p>
        </div>
      )}
    </div>
  );
}
