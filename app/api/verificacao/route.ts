import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { PRICING } from "@/lib/utils";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const rl = rateLimit(`verificacao:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { tipo?: string; documentUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const tipo = String(body.tipo ?? "");
  if (!["PESSOAL", "EMPRESA"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo de verificação inválido." }, { status: 400 });
  }

  const existing = await prisma.verificationRequest.findFirst({
    where: { userId: session.user.id, status: { in: ["PENDENTE", "APROVADO"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "PENDENTE" ? "Já tem uma verificação pendente." : "Já está verificado." },
      { status: 409 }
    );
  }

  const price = tipo === "EMPRESA" ? PRICING.VERIFICACAO_EMPRESA : PRICING.VERIFICACAO_PESSOAL;

  const transaction = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: "VERIFICACAO",
        amount: price,
        status: "PAID",
        reference: `VER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: tipo === "EMPRESA" ? "Verificação de empresa" : "Verificação de identidade",
      },
    });

    const request = await tx.verificationRequest.create({
      data: {
        userId: session.user.id,
        type: tipo,
        documentUrl: body.documentUrl || null,
        status: "PENDENTE",
      },
    });

    return { txn, request };
  });

  return NextResponse.json(transaction, { status: 201 });
}