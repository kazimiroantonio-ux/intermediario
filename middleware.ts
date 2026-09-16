import { NextRequest, NextResponse } from "next/server";

/**
 * Primeira barreira de proteção de rotas (edge).
 * - Bloqueia visitantes sem cookie de sessão em áreas privadas.
 * - A validação REAL da sessão e da role continua no servidor
 *   (layouts + route handlers com auth.api.getSession), porque sessões
 *   better-auth vivem na base de dados e não são verificáveis na edge.
 *   Isto elimina o "flash" de conteúdo protegido e corta tráfego bot.
 */

const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

const PROTECTED_PREFIXES = ["/conta", "/mensagens", "/admin", "/vender"];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasSessionCookie(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = "";
      url.searchParams.set("callback", pathname);
      const res = NextResponse.redirect(url);
      // Impede cache intermédio da decisão de autorização.
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/conta/:path*", "/mensagens", "/admin/:path*", "/vender"],
};
