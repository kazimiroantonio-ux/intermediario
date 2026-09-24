"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "@/components/NotificationBell";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/listar?categoria=AUTOMOVEL", label: "Carros" },
  { href: "/listar?categoria=IMOBILIARIO", label: "Imóveis" },
  { href: "/listar?categoria=TERRENO", label: "Terrenos" },
  { href: "/listar?categoria=MOTORIZADAS", label: "Motorizadas" },
  { href: "/empresas", label: "Empresas" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) window.location.href = `/listar?q=${encodeURIComponent(search.trim())}`;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-bold text-emerald-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M2 12h20" />
              <path d="M12 2l-4 4M12 2l4 4M12 22l-4-4M12 22l4-4" />
            </svg>
          </span>
          O Intermediário
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 items-center lg:flex">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <NotificationBell />
          {!isPending && session ? (
            <>
              {(session.user as unknown as { role?: string }).role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/conta"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                {session.user.name.split(" ")[0]}
              </Link>
              <Link
                href="/conta/anuncios/novo"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Publicar Anúncio
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/entrar"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Entrar
              </Link>
              <Link
                href="/registar"
                className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                Registar
              </Link>
              <Link
                href="/conta/anuncios/novo"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Publicar Anúncio
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
          aria-label="Abrir menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="mb-3 md:hidden">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white"
            />
          </form>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
            {!isPending && session ? (
              <>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <Link href="/conta/notificacoes" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-zinc-600">
                    Notificações
                  </Link>
                </div>
                <Link href="/conta" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
                  Painel ({session.user.name.split(" ")[0]})
                </Link>
                {(session.user as unknown as { role?: string }).role === "ADMIN" && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50">
                    Admin
                  </Link>
                )}
                <Link
                  href="/conta/anuncios/novo"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  Publicar Anúncio
                </Link>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/entrar" onClick={() => setMenuOpen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-700">
                  Entrar
                </Link>
                <Link href="/registar" onClick={() => setMenuOpen(false)} className="rounded-lg border border-emerald-600 px-4 py-2 text-center text-sm font-semibold text-emerald-700">
                  Registar
                </Link>
                <Link
                  href="/conta/anuncios/novo"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  Publicar Anúncio
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
