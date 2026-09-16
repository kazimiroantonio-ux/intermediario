import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, sanitizeText, rateLimit, clientIp } from "@/lib/security";

const VALID_REASONS = ["SPAM", "FRAUDE", "CONTEUDO_INAPROPRIADO", "PREÇO_ENGANOSO", "PRODUTO_ILEGAL", "DUPLICADO", "OUTRO"];

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão para denunciar." }, { status: 401 });
  }

  const rl = rateLimit(`denuncias:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas denúncias. Tente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { listingId?: string; reason?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const listingId = String(body.listingId ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const description = sanitizeText(String(body.description ?? ""), 2000);

  if (!listingId) return NextResponse.json({ error: "Falta o anúncio." }, { status: 400 });
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Motivo de denúncia inválido." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true },
  });
  if (!listing) return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });

  const existing = await prisma.report.findFirst({
    where: { reporterId: session.user.id, listingId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Já denunciou este anúncio." }, { status: 409 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      listingId,
      reason,
      description: description || null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
