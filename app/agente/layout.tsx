import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";

const nav = [
  { href: "/agente", label: "Visão geral", icon: "📊" },
  { href: "/agente/negocios", label: "Negócios", icon: "🤝" },
  { href: "/agente/fila", label: "Fila", icon: "⏳" },
  { href: "/agente/comissoes", label: "Comissões", icon: "💰" },
];

export default async function AgenteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar?callback=/agente");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agent: { select: { id: true, code: true, status: true, ratingAvg: true } } },
  });

  const isAgent = Boolean(user?.agent);
  if (!isAgent) redirect("/conta");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-56">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{session.user.name}</p>
              <p className="truncate text-xs text-zinc-500">Agente · {user?.agent?.code}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${user?.agent?.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {user?.agent?.status === "APPROVED" ? "Aprovado" : "Em análise"}
            </span>
            <span>★ {Number(user?.agent?.ratingAvg ?? 0).toFixed(1)}</span>
          </div>

          <nav className="mt-3 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/conta"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              ← A minha conta
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}