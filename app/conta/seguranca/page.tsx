import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sessionListView } from "@/lib/sessions";
import { SessionManager } from "@/components/SessionManager";

export const dynamic = "force-dynamic";

export default async function SegurancaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const raw = await auth.api.listSessions({ headers: await headers() });
  const sessions = sessionListView(raw, session.session.token);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Segurança</h1>
        <p className="text-sm text-zinc-500">
          Gestão de sessões dispositivos e revogação remota.
        </p>
      </header>
      <SessionManager sessions={sessions} />
    </div>
  );
}