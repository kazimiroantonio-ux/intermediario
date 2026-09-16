import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Visão geral", icon: "📊" },
  { href: "/admin/anuncios", label: "Anúncios", icon: "📢" },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: "👥" },
  { href: "/admin/denuncias", label: "Denúncias", icon: "🚩" },
  { href: "/admin/verificacoes", label: "Verificações", icon: "✔️" },
  { href: "/admin/banners", label: "Banners", icon: "📊" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  const role = (session.user as unknown as { role?: string }).role;
  if (role !== "ADMIN") redirect("/conta");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-56">
        <div className="rounded-xl border border-purple-200 bg-white p-4">
          <div className="border-b border-zinc-100 pb-3">
            <p className="text-sm font-bold text-purple-800">Painel Admin</p>
            <p className="mt-0.5 text-xs text-zinc-500">{session.user.name}</p>
          </div>
          <nav className="mt-3 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-purple-50 hover:text-purple-800"
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/conta"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            >
              ← Voltar ao site
            </Link>
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
