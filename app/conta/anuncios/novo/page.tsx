"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ATTRIBUTE_FIELDS, CATEGORIES, PROVINCES, SUBCATEGORIES } from "@/lib/utils";

export default function NovoAnuncioPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("AUTOMOVEL");
  const [subcategory, setSubcategory] = useState("");
  const [dealType, setDealType] = useState("VENDA");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files).slice(0, 8)) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (res.ok) newUrls.push(data.url);
    }
    setImages((prev) => [...prev, ...newUrls].slice(0, 8));
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrValues)) {
      if (value.trim() !== "") {
        attributes[key] = value;
      }
    }

    try {
      const res = await fetch("/api/anuncios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, price: Number(price), category, subcategory, dealType, province, municipality, attributes, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao publicar o anúncio.");
      router.push(`/anuncio/${data.listingId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao publicar.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Publicar anúncio</h1>
      <p className="text-sm text-zinc-500">
        Grátis na publicação. Apenas cobramos a intermediação quando o negócio é concluído.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">Informação básica</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Título do anúncio *</label>
              <input
                required
                minLength={5}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Toyota Land Cruiser 2021, Apartamento T3 no Talatona"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Descrição *</label>
              <textarea
                required
                minLength={20}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o bem, o seu estado, documentação, motivos da venda..."
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Preço (AOA) *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 8500000"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Tipo de negócio *</label>
                <select
                  value={dealType}
                  onChange={(e) => setDealType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="VENDA">Venda</option>
                  <option value="ALUGUER">Aluguer</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory("");
                    setAttrValues({});
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.short}</option>
                  ))}
                </select>
              </div>
              {(SUBCATEGORIES[category]?.length ?? 0) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Subcategoria</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Selecionar...</option>
                    {(SUBCATEGORIES[category] ?? []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700">Província *</label>
                <select
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">Selecionar...</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Município</label>
                <input
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ex: Talatona, Viana"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">Características</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ATTRIBUTE_FIELDS[category]?.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-zinc-700">{field.label}</label>
                {field.options && field.options.length > 0 ? (
                  <select
                    value={attrValues[field.key] ?? ""}
                    onChange={(e) => setAttrValues({ ...attrValues, [field.key]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">—</option>
                    {field.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={attrValues[field.key] ?? ""}
                    onChange={(e) => setAttrValues({ ...attrValues, [field.key]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">Fotos</h2>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 py-8 text-zinc-500 transition-colors hover:border-emerald-500 hover:text-emerald-600">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="mt-2 text-sm font-medium">{uploading ? "A carregar..." : "Carregar fotos (até 8)"}</span>
            <input type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </label>
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Remover foto"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "A publicar..." : "Publicar anúncio"}
        </button>
      </form>
    </div>
  );
}
