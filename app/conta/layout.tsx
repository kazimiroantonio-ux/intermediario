import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";

const nav = [
  { href: "/conta", label: "Visão geral" },
  { href: "/conta/anuncios", label: "Meus anúncios" },
  { href: "/conta/anuncios/novo", label: "Publicar anúncio" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/conta/reservas", label: "Reservas" },
  { href: "/conta/favoritos", label: "Favoritos" },
  { href: "/conta/notificacoes", label: "Notificações" },
  { href: "/conta/plano", label: "Plano Premium" },
  { href: "/conta/verificacao", label: "Selo Verificado" },
  { href: "/conta/publicidade", label: "Publicidade" },
  { href: "/conta/seguranca", label: "Segurança" },
];

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, isVerified: true, role: true },
  });

  const isAgent = user?.role === "AGENT";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-56">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {session.user.name}
                {user?.isVerified && (
                  <span className="ml-1 text-xs text-amber-500">★</span>
                )}
              </p>
              <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
            </div>
          </div>

          {user && !user.emailVerified && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Verifique o seu e-mail</p>
              <p className="mt-1 leading-5">
                Consulte a caixa de entrada para confirmar a sua conta.
              </p>
            </div>
          )}

          <nav className="mt-3 flex flex-col gap-1">
            {isAgent && (
              <Link
                href="/conta/agente/dashboard"
                className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                🤝 Painel do Agente
              </Link>
            )}
            <Link
              href="/conta/vendedor/dashboard"
              className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              🛍️ Painel do Vendedor
            </Link>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
