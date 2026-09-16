"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, PROVINCES, SUBCATEGORIES } from "@/lib/utils";

type FilterState = {
  categoria: string;
  subcategoria: string;
  tipo: string;
  provincia: string;
  municipio: string;
  min: string;
  max: string;
  q: string;
  destaque: boolean;
  ordem: string;
};

export function ListingFilters({ initial }: { initial: FilterState }) {
  const router = useRouter();
  const [form, setForm] = useState<FilterState>(initial);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (form.categoria) params.set("categoria", form.categoria);
    if (form.subcategoria) params.set("subcategoria", form.subcategoria);
    if (form.tipo) params.set("tipo", form.tipo);
    if (form.provincia) params.set("provincia", form.provincia);
    if (form.municipio) params.set("municipio", form.municipio);
    if (form.min) params.set("min", form.min);
    if (form.max) params.set("max", form.max);
    if (form.q) params.set("q", form.q);
    if (form.destaque) params.set("destaque", "1");
    if (form.ordem) params.set("ordem", form.ordem);
    router.push(`/listar${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const subcategories = form.categoria ? SUBCATEGORIES[form.categoria] ?? [] : [];

  return (
    <form onSubmit={applyFilters} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={form.q}
          onChange={(e) => setForm({ ...form, q: e.target.value })}
          placeholder="Pesquisar (ex: Toyota, T3)"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 lg:col-span-2"
        />
        <select
          value={form.categoria}
          onChange={(e) => setForm({ ...form, categoria: e.target.value, subcategoria: "" })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.short}</option>
          ))}
        </select>
        {subcategories.length > 0 && (
          <select
            value={form.subcategoria}
            onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Subcategoria</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        >
          <option value="">Venda e Aluguer</option>
          <option value="VENDA">Venda</option>
          <option value="ALUGUER">Aluguer</option>
        </select>
        <select
          value={form.provincia}
          onChange={(e) => setForm({ ...form, provincia: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        >
          <option value="">Todas as províncias</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={form.municipio}
          onChange={(e) => setForm({ ...form, municipio: e.target.value })}
          placeholder="Município"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
        />
        <div className="flex gap-2 lg:col-span-2">
          <input
            value={form.min}
            onChange={(e) => setForm({ ...form, min: e.target.value })}
            placeholder="Preço min"
            inputMode="numeric"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <input
            value={form.max}
            onChange={(e) => setForm({ ...form, max: e.target.value })}
            placeholder="Preço máx"
            inputMode="numeric"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-amber-50/50 px-3 py-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={form.destaque}
            onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
            className="h-4 w-4 accent-amber-500"
          />
          ⭐ Apenas destaques
        </label>
        <div className="flex gap-2">
          <select
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Mais recentes</option>
            <option value="visualizacoes">Mais vistos</option>
            <option value="preco_asc">Preço: menor</option>
            <option value="preco_desc">Preço: maior</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Filtrar resultados
      </button>
    </form>
  );
}
