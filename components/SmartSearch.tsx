"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, PROVINCES, SEARCHABLE_FIELDS, SUBCATEGORIES } from "@/lib/utils";

export function SmartSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [provincia, setProvincia] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});

  function changeCategory(value: string) {
    setCategoria(value);
    setSubcategoria("");
    setAttrs({});
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria) params.set("categoria", categoria);
    if (subcategoria) params.set("subcategoria", subcategoria);
    if (provincia) params.set("provincia", provincia);
    if (min) params.set("min", min);
    if (max) params.set("max", max);
    for (const [key, value] of Object.entries(attrs)) {
      if (value) params.set(key, value);
    }
    router.push(`/listar${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const searchableFields = categoria ? SEARCHABLE_FIELDS[categoria] ?? [] : [];
  const subcategories = categoria ? SUBCATEGORIES[categoria] ?? [] : [];

  return (
    <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-4">
      <form
        onSubmit={search}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-bold text-zinc-900">O que procura?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar... ex: Toyota, T3"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 lg:col-span-2"
          />
          <select
            value={categoria}
            onChange={(e) => changeCategory(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.short}</option>
            ))}
          </select>
          {subcategories.length > 0 && (
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Subcategoria</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {searchableFields.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {searchableFields.slice(0, 4).map((f) =>
              f.options && f.options.length > 0 ? (
                <select
                  key={f.key}
                  value={attrs[f.key] ?? ""}
                  onChange={(e) => setAttrs({ ...attrs, [f.key]: e.target.value })}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">{f.label}</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  key={f.key}
                  value={attrs[f.key] ?? ""}
                  onChange={(e) => setAttrs({ ...attrs, [f.key]: e.target.value })}
                  placeholder={f.label}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              )
            )}
          </div>
        )}

        <div className="mt-3 grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Todas as províncias</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="flex gap-2 lg:col-span-2">
            <input
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="Preço mínimo"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <input
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Preço máximo"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Pesquisar
          </button>
        </div>
      </form>
    </section>
  );
}

