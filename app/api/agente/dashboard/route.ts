import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agentAuth";
import { prisma } from "@/lib/prisma";
import { aggregateCommissions, totalReceivedFromPayouts } from "@/lib/agentPayout";
import { PAYOUT_PENDING_STATUSES } from "@/lib/agentAccess";
import type { PayoutStatus } from "@prisma/client";

export async function GET(request: Request) {
  const ctx = await requireAgent(request);
  if (!ctx.ok) return ctx.response;
  const { agent } = ctx;

  const [commissions, payouts, bankAccount, pendingPayoutCount] = await Promise.all([
    prisma.commission.findMany({
      where: { deal: { agentId: agent.id } },
      select: {
        id: true,
        status: true,
        agentAmount: true,
        payoutId: true,
        createdAt: true,
        deal: { select: { reference: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.agentPayout.findMany({
      where: { agentId: agent.id },
      select: {
        id: true,
        status: true,
        netAmount: true,
        grossAmount: true,
        createdAt: true,
        paidAt: true,
        reference: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.bankAccount.findFirst({
      where: { userId: agent.userId, status: "VERIFICADO" },
      select: { id: true },
    }),
    prisma.agentPayout.count({
      where: {
        agentId: agent.id,
        status: { in: PAYOUT_PENDING_STATUSES as unknown as PayoutStatus[] },
      },
    }),
  ]);

  const agg = aggregateCommissions(
    commissions.map((c) => ({
      status: c.status,
      agentAmount: c.agentAmount,
      payoutId: c.payoutId,
    }))
  );
  const totalReceived = totalReceivedFromPayouts(
    payouts.map((p) => ({ status: p.status, netAmount: p.netAmount }))
  );

  return NextResponse.json({
    agent: {
      code: agent.code,
      status: agent.status,
      tier: agent.tier,
      ratingAvg: agent.ratingAvg,
      approvedAt: agent.approvedAt?.toISOString() ?? null,
    },
    balances: {
      availableMinor: agg.availableMinor.toString(),
      pendingMinor: agg.pendingMinor.toString(),
      outstandingMinor: agg.outstandingMinor.toString(),
      totalReceivedMinor: totalReceived.toString(),
      disputedMinor: agg.disputedMinor.toString(),
    },
    hasVerifiedBankAccount: !!bankAccount,
    hasPendingPayout: pendingPayoutCount > 0,
    recentCommissions: commissions.map((c) => ({
      id: c.id,
      status: c.status,
      dealReference: c.deal?.reference ?? null,
      agentAmountMinor: c.agentAmount.toString(),
      createdAt: c.createdAt.toISOString(),
    })),
    recentPayouts: payouts.map((p) => ({
      id: p.id,
      status: p.status,
      netAmountMinor: p.netAmount.toString(),
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      reference: p.reference,
    })),
  });
}