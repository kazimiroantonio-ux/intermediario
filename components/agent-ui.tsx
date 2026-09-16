// ---------------------------------------------------------------------------
// Pequenos blocos de estado do painel do agente (apresentação).
// Estados obrigatórios: loading, erro, vazio e cartões de conteúdo.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";

type Tone = "green" | "amber" | "red" | "blue" | "zinc";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
  zinc: "bg-zinc-100 text-zinc-700",
};

export function statusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
    case "PAID":
    case "VERIFICADO":
      return "green";
    case "PENDING_REVIEW":
    case "PENDING":
    case "PENDENTE":
    case "ACCRUED":
    case "DRAFT":
    case "EM_VERIFICACAO":
    case "EM_PROCESSAMENTO":
    case "REJEITADO":
    case "DISPUTED":
      return "amber";
    case "FAILED":
    case "REVERSED":
    case "SUSPENDED":
    case "SUSPENSO":
    case "REJECTED":
      return "red";
    case "PAYABLE":
    case "PROCESSING":
      return "blue";
    default:
      return "zinc";
  }
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[statusTone(status)]}`}
    >
      {label ?? status}
    </span>
  );
}

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
        {icon && <span aria-hidden>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}

export function LoadingBox({ label = "A carregar..." }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-700"
      role="status"
    >
      <span aria-hidden>…</span>
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
      <p className="font-semibold">Não foi possível carregar esta secção.</p>
      <p className="mt-1 text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ icon = "📭", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
      <p className="text-2xl" aria-hidden>{icon}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-800">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-600">{hint}</p>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-zinc-700">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}