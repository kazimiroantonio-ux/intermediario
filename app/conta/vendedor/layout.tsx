import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const nav = [
  { href: "/conta/vendedor/dashboard", label: "Painel", icon: "📊" },
  { href: "/conta/vendedor/negocios", label: "Negócios", icon: "🤝" },
  { href: "/conta/vendedor/comissoes", label: "Comissões", icon: "💸" },
];

const shortcuts = [
  { href: "/conta/anuncios", label: "Meus anúncios", icon: "📢" },
  { href: "/conta/anuncios/novo", label: "Publicar", icon: "✏️" },
  { href: "/conta/reservas", label: "Reservas", icon: "📅" },
  { href: "/conta/verificacao", label: "Selo Verificado", icon: "✓" },
  { href: "/conta/seguranca", label: "Segurança", icon: "🔒" },
];

export default async function VendedorLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isVerified: true, role: true },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span aria-hidden>🛍️</span> Painel do Vendedor
              {user?.isVerified && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">★ Verificado</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-700">
              {session.user.name} · {session.user.email}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <span aria-hidden>{item.icon}</span> {item.label}
            </Link>
          ))}
          <span className="hidden text-zinc-400 sm:inline">|</span>
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <span aria-hidden>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}