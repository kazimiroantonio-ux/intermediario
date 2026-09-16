import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/sellerAuth";
import { prisma } from "@/lib/prisma";
import { sellerFinanceSummary, sellerDealSummary, sumTransfersMinor } from "@/lib/sellerFinance";
import { toMinor } from "@/lib/commission";

export async function GET(request: Request) {
  const ctx = await requireSeller(request);
  if (!ctx.ok) return ctx.response;
  const { user } = ctx;

  const [activeListingCount, allDeals, recentDeals, commissions, reservations, pendingResCount, unreadMessages, bankAccount, transfers] = await Promise.all([
    prisma.listing.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.deal.findMany({
      where: { sellerId: user.id },
      select: { status: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.deal.findMany({
      where: { sellerId: user.id },
      select: {
        id: true,
        reference: true,
        status: true,
        agreedPrice: true,
        createdAt: true,
        listing: { select: { title: true } },
        buyer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.commission.findMany({
      where: { deal: { sellerId: user.id } },
      select: {
        id: true,
        status: true,
        totalCommission: true,
        createdAt: true,
        paidAt: true,
        deal: { select: { reference: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.reservation.findMany({
      where: { listing: { userId: user.id } },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        listing: { select: { title: true } },
        buyer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.reservation.count({
      where: { listing: { userId: user.id }, status: "PENDING" },
    }),
    prisma.message.count({
      where: {
        chatRoom: { sellerId: user.id },
        senderId: { not: user.id },
        isRead: false,
      },
    }),
    prisma.bankAccount.findFirst({
      where: { userId: user.id, status: "VERIFICADO" },
      select: { id: true },
    }),
    prisma.sellerTransfer.findMany({
      where: { deal: { sellerId: user.id } },
      select: { amount: true },
      orderBy: { declaredAt: "desc" },
      take: 500,
    }),
  ]);

  const dealAgg = sellerDealSummary(allDeals);
  const financeAgg = sellerFinanceSummary(commissions);
  const receivedMinor = sumTransfersMinor(transfers);

  return NextResponse.json({
    counts: {
      activeListings: activeListingCount,
      openDeals: dealAgg.open,
      wonDeals: dealAgg.won,
      lostDeals: dealAgg.lost,
      pendingReservations: pendingResCount,
      unreadMessages,
    },
    finance: {
      pendingMinor: financeAgg.pendingMinor.toString(),
      paidMinor: financeAgg.paidMinor.toString(),
      revertedMinor: financeAgg.revertedMinor.toString(),
      receivedMinor: receivedMinor.toString(),
    },
    hasVerifiedBankAccount: !!bankAccount,
    recentDeals: recentDeals.map((d) => ({
      id: d.id,
      reference: d.reference,
      status: d.status,
      title: d.listing?.title ?? null,
      buyerName: d.buyer?.name ?? null,
      agreedPriceMinor: d.agreedPrice?.toString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    recentCommissions: commissions.slice(0, 5).map((c) => ({
      id: c.id,
      status: c.status,
      dealReference: c.deal?.reference ?? null,
      totalCommissionMinor: c.totalCommission.toString(),
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
    })),
    recentReservations: reservations.slice(0, 5).map((r) => ({
      id: r.id,
      status: r.status,
      listingTitle: r.listing?.title ?? null,
      buyerName: r.buyer?.name ?? null,
      priceMinor: toMinor(Number(r.totalPrice)).toString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}