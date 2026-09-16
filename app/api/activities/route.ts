import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

const SIDES = new Set(["BUYER", "SELLER"]);
const TYPES = new Set(["BUYING", "SELLING", "VISITING", "INVESTIGATING"]);

// GET /api/activities?side=BUYER|SELLER|ALL — lista as atividades da minha conta
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const url = new URL(request.url);
  const side = (url.searchParams.get("side") ?? "ALL").toUpperCase();
  const type = (url.searchParams.get("type") ?? "ALL").toUpperCase();

  const activities = await prisma.userActivity.findMany({
    where: {
      userId: session.user.id,
      ...(SIDES.has(side) ? { side: side as "BUYER" | "SELLER" } : {}),
      ...(TYPES.has(type) ? { activityType: type as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ activities });
}

// POST /api/activities — regista uma atividade na conta única (contexto seguro)
export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const activityType = String(body.activityType ?? "").toUpperCase();
  const side = String(body.side ?? "").toUpperCase();
  if (!TYPES.has(activityType)) {
    return NextResponse.json({ error: "Tipo de atividade inválido." }, { status: 400 });
  }
  if (!SIDES.has(side)) {
    return NextResponse.json({ error: "Lado inválido." }, { status: 400 });
  }
  const expecting =
    activityType === "SELLING" ? "SELLER" : "BUYER";
  if (side !== expecting) {
    return NextResponse.json({ error: `Atividade ${activityType} não pode ter lado ${side}.` }, { status: 400 });
  }

  const activity = await prisma.userActivity.create({
    data: {
      userId: session.user.id,
      activityType: activityType as never,
      side: side as never,
      transactionId: body.transactionId ? String(body.transactionId).slice(0, 64) : null,
      listingId: body.listingId ? String(body.listingId).slice(0, 64) : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}