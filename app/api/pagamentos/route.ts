import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { PLANS } from "@/lib/utils";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const rl = rateLimit(`pagamentos:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { tipo?: string; planoId?: string; listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const tipo = String(body.tipo ?? "");

  if (tipo === "PLANO") {
    const planoId = String(body.planoId ?? "");
    const plan = PLANS.find((p) => p.id === planoId);
    if (!plan || plan.price <= 0) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    const reference = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "PLANO",
        amount: plan.price,
        status: "PAID",
        reference,
        planTier: plan.id as "BASICO" | "PRO" | "EMPRESA",
        description: `Plano ${plan.name}`,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  }

  if (tipo === "DESTAQUE") {
    const listingId = String(body.listingId ?? "");
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
    if (listing.userId !== session.user.id) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const reference = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        listingId,
        type: "DESTAQUE",
        amount: 5000,
        status: "PAID",
        reference,
        isDestaque: true,
        description: `Destaque de anúncio: ${listing.title}`,
      },
    });

    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + 30);

    await prisma.listing.update({
      where: { id: listingId },
      data: { isFeatured: true, featuredUntil },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo de pagamento inválido." }, { status: 400 });
}
