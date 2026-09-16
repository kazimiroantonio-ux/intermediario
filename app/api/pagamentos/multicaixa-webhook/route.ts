import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Validação do Token/Assinatura de Segurança da Gateway
    const signature = await Promise.resolve(request.headers.get("x-gateway-signature"));
    const webhookSecret = process.env.MULTICAIXA_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
    }

    const rawBody = await request.text();
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    let body: { referenceCode?: string; status?: string; paidAmount?: number; paidAt?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
    }

    const { referenceCode, status, paidAt } = body;

    // 2. Procurar o pagamento pendente na base de dados
    const payment = await prisma.payment.findUnique({
      where: { referenceCode },
      include: {
        subscription: { include: { plan: true } },
        listingPromotion: { include: { package: true, listing: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }

    // Guardar Idempotência: Se já foi aprovado ou rejeitado, apenas responder HTTP 200
    if (payment.status !== PaymentStatus.PENDING) {
      return NextResponse.json({ message: "Evento já processado" }, { status: 200 });
    }

    // 3. Tratar caso de Pagamento Rejeitado / Expirado
    if (status !== "SUCCESS") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REJECTED },
      });
      return NextResponse.json({ message: "Pagamento marcado como rejeitado" }, { status: 200 });
    }

    // 4. Transação Atómica: Atualizar Pagamento + Ativar Subscrição ou Destaque
    await prisma.$transaction(async (tx) => {
      // a) Atualizar Estado do Pagamento
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.APPROVED,
          paidAt: new Date(paidAt || Date.now()),
        },
      });

      // b) Se for uma Subscrição (Plano Profissional / Empresa)
      if (payment.subscriptionId && payment.subscription) {
        const plan = payment.subscription.plan;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + plan.durationDays);

        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            isActive: true,
            startDate,
            endDate,
          },
        });

        // Atualizar também o papel do utilizador na plataforma
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            role: plan.slug === "enterprise" ? "ENTERPRISE" : "PRO",
            isVerified: plan.hasBadge ? true : undefined,
          },
        });
      }

      // c) Se for um Destaque de Anúncio
      if (payment.listingPromotionId && payment.listingPromotion) {
        const pkg = payment.listingPromotion.package;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + pkg.durationDays);

        await tx.listingPromotion.update({
          where: { id: payment.listingPromotionId },
          data: {
            isActive: true,
            startDate,
            endDate,
          },
        });

        // Refletir o destaque no anúncio (home topo / categoria)
        if (pkg.position === "HOME_HERO" || pkg.position === "CATEGORY_TOP") {
          await tx.listing.update({
            where: { id: payment.listingPromotion.listingId },
            data: { isFeatured: true, featuredUntil: endDate },
          });
        }
      }
    });

    // Responder rapidamente com 200 OK para a gateway não repetir a chamada
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao processar Webhook MCX:", error);
    // Erros 5xx fazem a gateway tentar novamente mais tarde (Retry Mechanism)
    return NextResponse.json({ error: "Erro interno ao processar webhook" }, { status: 500 });
  }
}