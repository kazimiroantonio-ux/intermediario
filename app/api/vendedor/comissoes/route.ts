import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/sellerAuth";
import { prisma } from "@/lib/prisma";
import { CommissionStatus } from "@prisma/client";

const VALID_STATUSES = Object.values(CommissionStatus);

export async function GET(request: Request) {
  const ctx = await requireSeller(request);
  if (!ctx.ok) return ctx.response;
  const { user } = ctx;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const de = url.searchParams.get("de");
  const ate = url.searchParams.get("ate");

  if (status && !VALID_STATUSES.includes(status as CommissionStatus)) {
    return NextResponse.json({ error: "Estado de comissão inválido." }, { status: 400 });
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

  const items = await prisma.commission.findMany({
    where: {
      deal: { sellerId: user.id },
      ...(status ? { status: status as CommissionStatus } : {}),
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
    },
    select: {
      id: true,
      status: true,
      dealAmount: true,
      rateBps: true,
      totalCommission: true,
      agentAmount: true,
      platformAmount: true,
      createdAt: true,
      paidAt: true,
      deal: { select: { reference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    count: items.length,
    filters: { status: status ?? null, de: de ?? null, ate: ate ?? null },
    items: items.map((c) => ({
      id: c.id,
      dealReference: c.deal?.reference ?? null,
      dealAmountMinor: c.dealAmount.toString(),
      rateBps: c.rateBps,
      totalCommissionMinor: c.totalCommission.toString(),
      agentAmountMinor: c.agentAmount.toString(),
      platformAmountMinor: c.platformAmount.toString(),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
    })),
  });
}