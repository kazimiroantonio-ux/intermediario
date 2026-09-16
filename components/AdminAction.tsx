"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAction({
  endpoint,
  payload,
  label,
  color = "zinc",
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  color?: "emerald" | "red" | "amber" | "purple" | "zinc" | "blue";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const colors: Record<string, string> = {
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    red: "bg-red-100 hover:bg-red-200 text-red-700",
    amber: "bg-amber-100 hover:bg-amber-200 text-amber-800",
    purple: "bg-purple-100 hover:bg-purple-200 text-purple-800",
    blue: "bg-blue-100 hover:bg-blue-200 text-blue-800",
    zinc: "bg-zinc-100 hover:bg-zinc-200 text-zinc-700",
  };

  async function run() {
    setLoading(true);
    try {
      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${colors[color]}`}
    >
      {loading ? "..." : label}
    </button>
  );
}
