// ---------------------------------------------------------------------------
// Guarda de sessão para os route handlers /api/vendedor/*.
// 401 sem sessão; qualquer utilizador autenticado é potencial vendedor
// (Qualquer role pode vender — não há gate de role nesta zona).
// O utilizador vem sempre da sessão — nunca do body/query/headers.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

type SellerUser = Pick<User, "id" | "role" | "email">;

export type SellerContext =
  | { ok: true; user: SellerUser }
  | { ok: false; response: NextResponse };

export async function requireSeller(
  request: Request,
  opts?: { csrf?: boolean }
): Promise<SellerContext> {
  if (opts?.csrf) {
    const csrf = assertSameOrigin(request);
    if (csrf) return { ok: false, response: csrf };
  }

  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as { user: SellerUser } | null;

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Inicie sessão para aceder." }, { status: 401 }),
    };
  }

  return { ok: true, user: session.user };
}