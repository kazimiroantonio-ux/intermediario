import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeAgent } from "@/lib/agentAccess";
import { AGENT_STATUS_LABEL } from "@/components/agent-labels";
import { StatusBadge } from "@/components/agent-ui";

const nav = [
  { href: "/conta/agente/dashboard", label: "Painel", icon: "📊" },
  { href: "/conta/agente/comissoes", label: "Comissões", icon: "💶" },
  { href: "/conta/agente/pagamentos", label: "Pagamentos", icon: "💸" },
  { href: "/conta/agente/perfil", label: "Perfil", icon: "👤" },
  { href: "/conta/agente/definicoes", label: "Definições", icon: "⚙️" },
];

export default async function AgenteLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const agent = session
    ? await prisma.agent.findUnique({ where: { userId: session.user.id } })
    : null;

  const decision = authorizeAgent(session, agent);
  if (!decision.ok) redirect("/entrar"); // 401/403 na UI → sessão

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span aria-hidden>🤝</span> Painel do Agente
              <StatusBadge status={agent!.status} label={AGENT_STATUS_LABEL[agent!.status] ?? agent!.status} />
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {agent!.code} · {agent!.fullName}
            </p>
          </div>
          <Link
            href="/conta/agente/pagamentos"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            💰 Solicitar pagamento
          </Link>
        </div>

        <nav className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap">
          {nav.map((item) => (
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