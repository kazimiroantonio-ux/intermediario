import { NextResponse } from "next/server";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { ProxyPayService } from "@/services/proxypay";
import { sendMulticaixaReferenceEmail } from "@/services/brevo";

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

  let body: { tipo?: string; planoSlug?: string; pacoteId?: string; listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const tipo = String(body.tipo ?? "");

  try {
    if (tipo === "PLANO") {
      const planoSlug = String(body.planoSlug ?? "").trim();
      if (!["pro", "enterprise"].includes(planoSlug)) {
        return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
      }
      const plan = await prisma.plan.findUnique({ where: { slug: planoSlug } });
      if (!plan || !plan.isActive) {
        return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
      }
      if (plan.priceInKz.toNumber() <= 0) {
        return NextResponse.json({ error: "Plano gratuito não requer pagamento." }, { status: 400 });
      }

      const proxyRef = await ProxyPayService.createReference({
        amountInKz: plan.priceInKz.toNumber(),
      });
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + plan.durationDays);

      const payment = await prisma.payment.create({
        data: {
          amount: plan.priceInKz,
          method: PaymentMethod.MULTICAIXA_EXPRESS,
          status: PaymentStatus.PENDING,
          referenceCode: proxyRef.referenceCode,
          user: { connect: { id: session.user.id } },
          subscription: {
            create: {
              user: { connect: { id: session.user.id } },
              plan: { connect: { id: plan.id } },
              startDate,
              endDate,
            },
          },
        },
        include: { subscription: true },
      });

      try {
        await sendMulticaixaReferenceEmail({
          toEmail: session.user.email,
          toName: session.user.name || "Utilizador",
          entity: proxyRef.entity,
          reference: proxyRef.referenceCode,
          amountInKz: plan.priceInKz.toNumber(),
          itemName: `Plano ${plan.name}`,
          expiresAt: proxyRef.expiryDate,
        });
      } catch (emailError) {
        console.error("Erro ao enviar email MCX (plano):", emailError);
      }

      return NextResponse.json(
        {
          paymentId: payment.id,
          referenceCode: proxyRef.referenceCode,
          entity: proxyRef.entity,
          amount: plan.priceInKz.toNumber(),
          method: "MULTICAIXA_EXPRESS",
          status: "PENDING",
        },
        { status: 201 }
      );
    }

    if (tipo === "DESTAQUE") {
      const pacoteId = String(body.pacoteId ?? "");
      const listingId = String(body.listingId ?? "");

      const pkg = await prisma.promotionPackage.findUnique({ where: { id: pacoteId } });
      if (!pkg || !pkg.isActive) {
        return NextResponse.json({ error: "Pacote de destaque inválido." }, { status: 400 });
      }
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
      if (listing.userId !== session.user.id) {
        return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
      }

      const proxyRef = await ProxyPayService.createReference({
        amountInKz: pkg.priceInKz.toNumber(),
      });
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + pkg.durationDays);

      const payment = await prisma.payment.create({
        data: {
          amount: pkg.priceInKz,
          method: PaymentMethod.MULTICAIXA_EXPRESS,
          status: PaymentStatus.PENDING,
          referenceCode: proxyRef.referenceCode,
          user: { connect: { id: session.user.id } },
          listingPromotion: {
            create: {
              listing: { connect: { id: listingId } },
              package: { connect: { id: pkg.id } },
              endDate,
            },
          },
        },
        include: { listingPromotion: true },
      });

      try {
        await sendMulticaixaReferenceEmail({
          toEmail: session.user.email,
          toName: session.user.name || "Utilizador",
          entity: proxyRef.entity,
          reference: proxyRef.referenceCode,
          amountInKz: pkg.priceInKz.toNumber(),
          itemName: pkg.name,
          expiresAt: proxyRef.expiryDate,
        });
      } catch (emailError) {
        console.error("Erro ao enviar email MCX (destaque):", emailError);
      }

      return NextResponse.json(
        {
          paymentId: payment.id,
          referenceCode: proxyRef.referenceCode,
          entity: proxyRef.entity,
          amount: pkg.priceInKz.toNumber(),
          method: "MULTICAIXA_EXPRESS",
          status: "PENDING",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Tipo de pagamento inválido." }, { status: 400 });
  } catch (error) {
    console.error("Erro ao criar pagamento MCX:", error);
    return NextResponse.json({ error: "Erro interno ao criar pagamento." }, { status: 500 });
  }
}