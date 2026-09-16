import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/agentAuth";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";

function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const trimmed = iban.replace(/\s+/g, "");
  if (trimmed.length <= 4) return "••••";
  return "•••• " + trimmed.slice(-4);
}

const PHONE_RE = /^\+244\d{9}$/;

export async function GET(request: Request) {
  const ctx = await requireAgent(request);
  if (!ctx.ok) return ctx.response;
  const { agent } = ctx;

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { userId: agent.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, bank: true, status: true, holderName: true },
  });

  return NextResponse.json({
    profile: {
      id: agent.id,
      code: agent.code,
      fullName: agent.fullName,
      phone: agent.phone,
      status: agent.status,
      tier: agent.tier,
      commissionShareBps: agent.commissionShareBps,
      payoutMethod: agent.payoutMethod,
      taxRegime: agent.taxRegime,
      bankName: agent.bankName,
      ibanMasked: maskIban(agent.iban),
      ratingAvg: agent.ratingAvg,
      createdAt: agent.createdAt.toISOString(),
    },
    bank: bankAccount
      ? { id: bankAccount.id, bank: bankAccount.bank, status: bankAccount.status, holderName: bankAccount.holderName }
      : null,
  });
}

export async function PATCH(request: Request) {
  const ctx = await requireAgent(request, { csrf: true });
  if (!ctx.ok) return ctx.response;
  const { agent } = ctx;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data: { phone?: string; bankName?: string } = {};

  if ("phone" in body) {
    const phone = String(body.phone ?? "").trim();
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Telefone inválido (use +244 seguido de 9 dígitos)." }, { status: 400 });
    }
    data.phone = phone;
  }

  if ("bankName" in body) {
    const bankName = sanitizeText(String(body.bankName ?? ""), 60);
    if (!bankName) {
      return NextResponse.json({ error: "Nome do banco inválido." }, { status: 400 });
    }
    data.bankName = bankName;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  // O agente só pode atualizar estes campos do PRÓPRIO perfil (userId da sessão).
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data,
    select: { phone: true, bankName: true },
  });

  return NextResponse.json({
    ok: true,
    profile: {
      phone: updated.phone,
      bankName: updated.bankName,
    },
  });
}