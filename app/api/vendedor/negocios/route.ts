import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/sellerAuth";
import { prisma } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";

const VALID_STATUSES = Object.values(DealStatus);

export async function GET(request: Request) {
  const ctx = await requireSeller(request);
  if (!ctx.ok) return ctx.response;
  const { user } = ctx;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const de = url.searchParams.get("de");
  const ate = url.searchParams.get("ate");

  if (status && !VALID_STATUSES.includes(status as DealStatus)) {
    return NextResponse.json({ error: "Estado de negócio inválido." }, { status: 400 });
  }

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (de) {
    const d = new Date(de);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Data \"de\" inválida." }, { status: 400 });
    }
    createdAt.gte = d;
  }
  if (ate) {
    const d = new Date(ate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Data \"até\" inválida." }, { status: 400 });
    }
    d.setUTCHours(23, 59, 59, 999);
    createdAt.lte = d;
  }

  const items = await prisma.deal.findMany({
    where: {
      sellerId: user.id,
      ...(status ? { status: status as DealStatus } : {}),
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
    },
    select: {
      id: true,
      reference: true,
      type: true,
      status: true,
      listedPrice: true,
      agreedPrice: true,
      createdAt: true,
      closedAt: true,
      listing: { select: { title: true } },
      buyer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    count: items.length,
    filters: { status: status ?? null, de: de ?? null, ate: ate ?? null },
    items: items.map((d) => ({
      id: d.id,
      reference: d.reference,
      type: d.type,
      status: d.status,
      title: d.listing?.title ?? null,
      buyerName: d.buyer?.name ?? null,
      listedPriceMinor: d.listedPrice.toString(),
      agreedPriceMinor: d.agreedPrice?.toString() ?? null,
      createdAt: d.createdAt.toISOString(),
      closedAt: d.closedAt?.toISOString() ?? null,
    })),
  });
}