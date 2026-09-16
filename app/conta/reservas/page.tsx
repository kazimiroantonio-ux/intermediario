import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKwanza } from "@/lib/utils";
import { ReservationActions } from "@/components/ReservationActions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

export default async function ReservasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [received, made] = await Promise.all([
    prisma.reservation.findMany({
      where: { listing: { userId } },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        buyer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reservation.findMany({
      where: { buyerId: userId },
      include: {
        listing: { select: { id: true, title: true, images: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function Row({
    r,
    asBuyer,
    isSeller,
  }: {
    r: {
      id: string;
      listing: { id: string; title: string; images: string[] };
      status: string;
      totalPrice: { toString(): string };
      commission: { toString(): string } | null;
      startDate: Date;
      endDate: Date;
      buyer?: { name: string };
    };
    asBuyer?: boolean;
    isSeller?: boolean;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          {r.listing.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.listing.images[0]} alt={r.listing.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">🏠</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900">{r.listing.title}</p>
          {asBuyer && r.buyer?.name && (
            <p className="text-xs text-zinc-500">Comprador: {r.buyer.name}</p>
          )}
          <p className="text-xs text-zinc-500">
            {new Date(r.startDate).toLocaleDateString("pt-PT")} a {new Date(r.endDate).toLocaleDateString("pt-PT")}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-700">
            {formatKwanza(r.totalPrice.toString())}
          </p>
          {isSeller && r.status === "CONFIRMED" && r.commission && (
            <p className="text-xs text-zinc-500">
              Comissão (10%): <span className="font-medium text-amber-600">{formatKwanza(r.commission.toString())}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
            {STATUS_LABELS[r.status] ?? r.status}
          </span>
          <ReservationActions reservationId={r.id} status={r.status} isSeller={!!isSeller} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Reservas</h1>
      <p className="text-xs text-zinc-500">
        Ao confirmar uma reserva, a plataforma retém 10% (mínimo 1.000 Kz) como comissão. O restante é pago ao vendedor. Se um agente acompanhar o negócio, 5% é do agente e 5% é do site.
      </p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Reservas recebidas nos meus anúncios</h2>
        {received.length > 0 ? (
          <div className="space-y-3">
            {received.map((r) => (
              <Row key={r.id} r={r} asBuyer isSeller />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Ainda não recebeu pedidos de reserva.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Os meus pedidos de reserva</h2>
        {made.length > 0 ? (
          <div className="space-y-3">
            {made.map((r) => <Row key={r.id} r={r} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Ainda não fez pedidos de reserva.
          </p>
        )}
      </section>
    </div>
  );
}

async function headers() {
  const { headers: h } = await import("next/headers");
  return h();
}