import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";

export const metadata = {
  title: "Empresas parceiras",
  description: "Concessionárias, imobiliárias, lojas e agências verificadas na plataforma O Intermediário.",
};

export const dynamic = "force-dynamic";

const TIPOS = ["Concessionárias", "Imobiliárias", "Lojas", "Agências", "Construtoras"];

export default async function EmpresasPage() {
  const businesses = await prisma.user.findMany({
    where: { role: "VERIFIED_SELLER" },
    select: {
      id: true,
      name: true,
      companyName: true,
      image: true,
      isVerified: true,
      province: true,
      createdAt: true,
      _count: { select: { listings: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 48,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Empresas parceiras</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Concessionárias, imobiliárias, lojas, agências e construtoras que confiam na plataforma
        para vender com segurança em Angola.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <span key={t} className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-600">
            {t}
          </span>
        ))}
      </div>

      {businesses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-zinc-700">Ainda não há empresas registadas</p>
          <p className="mt-2 text-sm text-zinc-500">A sua empresa pode ser a primeira.</p>
          <Link
            href="/registar"
            className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Registar empresa
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/vendedor/${b.id}`}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt={b.companyName ?? b.name} className="h-full w-full object-cover" />
                ) : (
                  (b.companyName ?? b.name).charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-zinc-900">
                  {b.companyName ?? b.name}
                  {b.isVerified && <span className="ml-1.5 text-emerald-600" title="Verificado">✔</span>}
                </p>
                <p className="text-xs text-zinc-500">
                  {b.province ?? "Angola"} · {b._count.listings} anúncio{b._count.listings === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-zinc-400">{timeAgo(b.createdAt)} na plataforma</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
