import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agentAuth";
import { prisma } from "@/lib/prisma";
import {
  aggregateCommissions,
  canRequestPayout,
  MIN_PAYOUT_MINOR,
} from "@/lib/agentPayout";
import { PAYOUT_PENDING_STATUSES } from "@/lib/agentAccess";
import type { PayoutStatus } from "@prisma/client";

export async function GET(request: Request) {
  const ctx = await requireAgent(request);
  if (!ctx.ok) return ctx.response;
  const { agent } = ctx;

  const [payouts, commissions, bankAccount, pendingPayoutCount] = await Promise.all([
    prisma.agentPayout.findMany({
      where: { agentId: agent.id },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        grossAmount: true,
        withholdingTax: true,
        netAmount: true,
        status: true,
        reference: true,
        createdAt: true,
        paidAt: true,
        failureReason: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.commission.findMany({
      where: { deal: { agentId: agent.id } },
      select: { status: true, agentAmount: true, payoutId: true },
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

  const decision = canRequestPayout({
    availableMinor: agg.availableMinor,
    minPayoutMinor: MIN_PAYOUT_MINOR,
    hasVerifiedBankAccount: !!bankAccount,
    hasPendingPayout: pendingPayoutCount > 0,
  });

  return NextResponse.json({
    request: {
      ok: decision.ok,
      reason: decision.ok ? null : decision.reason,
      availableMinor: agg.availableMinor.toString(),
      minPayoutMinor: MIN_PAYOUT_MINOR.toString(),
      hasVerifiedBankAccount: !!bankAccount,
      hasPendingPayout: pendingPayoutCount > 0,
    },
    items: payouts.map((p) => ({
      id: p.id,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      grossAmountMinor: p.grossAmount.toString(),
      withholdingTaxMinor: p.withholdingTax.toString(),
      netAmountMinor: p.netAmount.toString(),
      status: p.status,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      failureReason: p.failureReason,
    })),
  });
}