import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { createNotification } from "@/lib/notify";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const withUser = await prisma.verificationRequest.findMany({
    select: {
      id: true,
      type: true,
      documentUrl: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, companyName: true, isVerified: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ requests: withUser });
}

export async function PATCH(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  let id: string, action: string, note: string | undefined;
  try {
    const body = await request.json();
    id = String(body.id ?? "");
    action = String(body.action ?? "");
    note = body.note ? String(body.note) : undefined;
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!["APROVAR", "REJEITAR"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const req = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!req || req.status !== "PENDENTE") {
    return NextResponse.json({ error: "Pedido não encontrado ou já processado." }, { status: 404 });
  }

  if (action === "APROVAR") {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: { status: "APROVADO", reviewedBy: session.user.id, reviewedAt: new Date(), expiresAt },
      }),
      prisma.user.update({
        where: { id: req.userId },
        data: { isVerified: true },
      }),
    ]);

    await createNotification(prisma, {
      userId: req.userId,
      type: "VERIFICACAO",
      title: "Verificação aprovada",
      content: "Parabéns! O seu selo de verificado está ativo por 12 meses.",
      link: "/conta",
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await prisma.verificationRequest.update({
    where: { id },
    data: { status: "REJEITADO", reviewedBy: session.user.id, reviewedAt: new Date() },
  });

  await createNotification(prisma, {
    userId: req.userId,
    type: "VERIFICACAO",
    title: "Verificação rejeitada",
    content: note || "O seu pedido de verificação foi rejeitado. Contacte o suporte para mais detalhes.",
    link: "/conta",
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}