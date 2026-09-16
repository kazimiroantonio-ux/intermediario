import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agentAuth";
import { prisma } from "@/lib/prisma";
import {
  buildPayoutRequest,
  canRequestPayout,
  MIN_PAYOUT_MINOR,
  normalizeIdempotencyKey,
} from "@/lib/agentPayout";
import { PAYOUT_PENDING_STATUSES } from "@/lib/agentAccess";
import { Prisma } from "@prisma/client";
import type { PayoutStatus } from "@prisma/client";

function mapPayout(p: {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  grossAmount: bigint;
  withholdingTax: bigint;
  netAmount: bigint;
  status: string;
  reference: string | null;
  createdAt: Date;
  paidAt: Date | null;
}) {
  return {
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
  };
}

export async function POST(request: Request) {
  const ctx = await requireAgent(request, { csrf: true });
  if (!ctx.ok) return ctx.response;
  const { agent } = ctx;

  // Idempotência: o cliente envia a mesma chave em todas as tentativas.
  const key = normalizeIdempotencyKey(request.headers.get("x-idempotency-key"));
  if (!key) {
    return NextResponse.json({ error: "Falta a chave de idempotência (x-idempotency-key)." }, { status: 400 });
  }

  // Já processado para ESTE agente? Devolve o registo original.
  const existing = await prisma.agentPayout.findFirst({
    where: { agentId: agent.id, idempotencyKey: key },
  });
  if (existing) {
    return NextResponse.json({ payout: mapPayout(existing), created: false });
  }

  const [availableCommissions, bankAccount, pendingPayoutCount] = await Promise.all([
    prisma.commission.findMany({
      where: { deal: { agentId: agent.id }, status: "PAYABLE", payoutId: null },
      select: { id: true, agentAmount: true },
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

  let availableMinor = 0n;
  for (const c of availableCommissions) availableMinor += c.agentAmount;

  const decision = canRequestPayout({
    availableMinor,
    minPayoutMinor: MIN_PAYOUT_MINOR,
    hasVerifiedBankAccount: !!bankAccount,
    hasPendingPayout: pendingPayoutCount > 0,
  });
  if (!decision.ok) {
    return NextResponse.json({ error: decision.reason }, { status: 400 });
  }

  const req = buildPayoutRequest({ grossMinor: availableMinor });
  const commissionIds = availableCommissions.map((c) => c.id);

  try {
    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.agentPayout.create({
        data: {
          agentId: agent.id,
          periodStart: new Date(req.periodStartIso),
          periodEnd: new Date(req.periodEndIso),
          grossAmount: req.grossMinor,
          withholdingTax: req.withholdingMinor,
          netAmount: req.netMinor,
          status: "DRAFT",
          idempotencyKey: key,
        },
      });
      // Liga as comissões ao pagamento: ficam fora do saldo disponível
      // (payoutId preenchido → não elegíveis para nova solicitação).
      await tx.commission.updateMany({
        where: { id: { in: commissionIds }, deal: { agentId: agent.id }, status: "PAYABLE", payoutId: null },
        data: { payoutId: created.id },
      });
      return created;
    });

    return NextResponse.json({ payout: mapPayout(payout), created: true, commissions: commissionIds.length }, { status: 201 });
  } catch (err) {
    // Concorrência entre tentativas com a mesma chave → devolve a já criada.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const dup = await prisma.agentPayout.findFirst({
        where: { agentId: agent.id, idempotencyKey: key },
      });
      if (dup) {
        return NextResponse.json({ payout: mapPayout(dup), created: false });
      }
    }
    return NextResponse.json({ error: "Não foi possível registar a solicitação. Tente novamente." }, { status: 500 });
  }
}