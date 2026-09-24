import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, sanitizeText, rateLimit, clientIp } from "@/lib/security";

const VALID_CATEGORIES = [
  "AUTOMOVEL",
  "MOTORIZADAS",
  "IMOBILIARIO",
  "TERRENO",
  "MAQUINAS",
  "MOVEIS",
  "OUTROS",
];
const VALID_DEAL_TYPES = ["VENDA", "ALUGUER"];

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão para publicar." }, { status: 401 });
  }

  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Verifique o seu email para publicar anúncios." },
      { status: 403 }
    );
  }

  const rl = rateLimit(`anuncios:${clientIp(request)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas publicações. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const title = sanitizeText(String(body.title ?? ""), 120);
  const description = sanitizeText(String(body.description ?? ""), 5000);
  const price = Number(body.price);
  const category = String(body.category ?? "");
  const subcategory = sanitizeText(String(body.subcategory ?? ""), 60);
  const dealType = String(body.dealType ?? "");
  const province = sanitizeText(String(body.province ?? ""), 60);
  const municipality = sanitizeText(String(body.municipality ?? ""), 60);

  const rawImages = Array.isArray(body.images) ? body.images.slice(0, 8) : [];
  const images: string[] = rawImages.filter(
    (i): i is string => typeof i === "string" && i.trim().length > 0
  );

  const rawAttributes = Array.isArray(body.attributes) ? body.attributes.slice(0, 30) : [];
  const attributes: Record<string, string> = {};
  for (const a of rawAttributes) {
    if (
      typeof a === "object" &&
      a !== null &&
      typeof (a as { key?: string }).key === "string" &&
      String((a as { key: string }).key).trim() !== "" &&
      String((a as { value: string }).value ?? "").trim() !== ""
    ) {
      attributes[a.key.trim()] = String(a.value).trim();
    }
  }

  if (!title || title.length < 5) {
    return NextResponse.json({ error: "O título deve ter pelo menos 5 caracteres." }, { status: 400 });
  }
  if (!description || description.length < 20) {
    return NextResponse.json({ error: "A descrição deve ter pelo menos 20 caracteres." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Indique um preço válido." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }
  if (!VALID_DEAL_TYPES.includes(dealType)) {
    return NextResponse.json({ error: "Tipo de negócio inválido." }, { status: 400 });
  }
  if (!province) {
    return NextResponse.json({ error: "Indique a província." }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      price,
      currency: "AOA",
      category,
      subcategory: subcategory || null,
      dealType: dealType as "VENDA" | "ALUGUER",
      province,
      municipality: municipality || null,
      userId: session.user.id,
      images,
      attributes,
    },
  });

  return NextResponse.json({ listingId: listing.id }, { status: 201 });
}
