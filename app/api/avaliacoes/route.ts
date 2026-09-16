import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, sanitizeText, rateLimit, clientIp } from "@/lib/security";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewedId = searchParams.get("reviewedId");
  if (!reviewedId) {
    return NextResponse.json({ error: "Falta reviewedId." }, { status: 400 });
  }

  const [reviews, seller] = await Promise.all([
    prisma.review.findMany({
      where: { reviewedId },
      include: { reviewer: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findUnique({
      where: { id: reviewedId },
      select: {
        _count: { select: { reviewsRec: true, listings: { where: { status: "ACTIVE" } } } },
        reviewsRec: { select: { rating: true } },
      },
    }),
  ]);

  const ratings = seller?.reviewsRec ?? [];
  const avg =
    ratings.length > 0
      ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
      : null;

  return NextResponse.json({
    reviews,
    average: avg ? Math.round(avg * 10) / 10 : null,
    total: seller?._count.reviewsRec ?? 0,
    listings: seller?._count.listings ?? 0,
  });
}

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão para avaliar." }, { status: 401 });
  }

  const rl = rateLimit(`avaliacoes:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas avaliações. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let reviewedId: string, rating: number, comment: string;
  try {
    const body = await request.json();
    reviewedId = String(body.reviewedId ?? "");
    rating = Number(body.rating);
    comment = sanitizeText(String(body.comment ?? ""), 1000);
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!reviewedId) return NextResponse.json({ error: "Falta o vendedor." }, { status: 400 });
  if (reviewedId === session.user.id) {
    return NextResponse.json({ error: "Não pode avaliar-se a si mesmo." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Avaliação deve ser entre 1 e 5." }, { status: 400 });
  }

  const reviewed = await prisma.user.findUnique({ where: { id: reviewedId } });
  if (!reviewed) return NextResponse.json({ error: "Vendedor não encontrado." }, { status: 404 });

  const review = await prisma.review.upsert({
    where: { reviewerId_reviewedId: { reviewerId: session.user.id, reviewedId } },
    update: { rating, comment: comment || null },
    create: { reviewerId: session.user.id, reviewedId, rating, comment: comment || null },
    include: { reviewer: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ review }, { status: 201 });
}
