import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { AdminAction } from "@/components/AdminAction";

export const dynamic = "force-dynamic";

export default async function AdminUtilizadoresPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      role: true,
      companyName: true,
      isVerified: true,
      province: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Gestão de utilizadores</h1>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Utilizador</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Anúncios</th>
              <th className="px-4 py-3">Registo</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">
                        {u.companyName ?? u.name}
                        {u.isVerified && <span className="ml-1 text-emerald-600" title="Verificado">✔</span>}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "ADMIN"
                      ? "bg-purple-100 text-purple-800"
                      : u.companyName
                        ? "bg-blue-100 text-blue-800"
                        : "bg-zinc-100 text-zinc-700"
                  }`}>
                    {u.role === "ADMIN" ? "Admin" : u.companyName ? "Empresa" : "Particular"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700">{u._count.listings}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{timeAgo(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {!u.isVerified ? (
                      <AdminAction
                        endpoint="/api/admin/utilizadores"
                        payload={{ id: u.id, action: "verificar" }}
                        label="✔ Verificar"
                        color="emerald"
                      />
                    ) : (
                      <AdminAction
                        endpoint="/api/admin/utilizadores"
                        payload={{ id: u.id, action: "desverificar" }}
                        label="Remover selo"
                        color="zinc"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
