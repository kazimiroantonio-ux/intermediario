"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRICING } from "@/lib/utils";

type ListingOption = { id: string; title: string };
type Banner = { id: string; title: string; position: string; status: string; startDate: Date; endDate: Date; impressions: number; clicks: number };
type Flash = { id: string; title: string; targetProvince: string | null; sentCount: number; openCount: number; status: string; createdAt: Date };

export function AdvertisingPanel({
  listings,
  initialBanners,
  initialFlash,
}: {
  listings: ListingOption[];
  initialBanners: Banner[];
  initialFlash: Flash[];
}) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [flash, setFlash] = useState(initialFlash);
  const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", linkUrl: "", position: "HERO" as "HERO" | "HOME_MID" | "LISTING_TOP" });
  const [flashForm, setFlashForm] = useState({ listingId: "", title: "", targetProvince: "" });
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const bannerPrices: Record<string, number> = {
    HERO: PRICING.BANNER.HERO,
    HOME_MID: PRICING.BANNER.HOME_MID,
    LISTING_TOP: PRICING.BANNER.LISTING_TOP,
  };

  const positionLabels: Record<string, string> = {
    HERO: "Topo da página inicial",
    HOME_MID: "Meio da página inicial",
    LISTING_TOP: "Topo das listagens",
  };

  async function buyBanner() {
    setMessage(null);
    if (!bannerForm.title || !bannerForm.imageUrl || !bannerForm.linkUrl) {
      setMessage({ type: "error", text: "Preencha título, URL da imagem e link de destino." });
      return;
    }
    setLoading("banner");
    try {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bannerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar o banner.");
      setBannerForm({ title: "", imageUrl: "", linkUrl: "", position: "HERO" });
      setMessage({ type: "ok", text: `Banner ativo por 7 dias (${bannerPrices[bannerForm.position]} Kz, pagamento simulado).` });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao criar o banner." });
    } finally {
      setLoading("");
    }
  }

  async function buyFlash() {
    setMessage(null);
    if (!flashForm.listingId || !flashForm.title) {
      setMessage({ type: "error", text: "Selecione o anúncio e escreva o título da promoção." });
      return;
    }
    setLoading("flash");
    try {
      const res = await fetch("/api/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: flashForm.listingId,
          title: flashForm.title,
          targetProvince: flashForm.targetProvince || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao lançar a promoção.");
      setFlashForm({ listingId: "", title: "", targetProvince: "" });
      setMessage({
        type: "ok",
        text: `Promoção enviada a ${data.sentCount ?? 0} utilizadores por notificação (${PRICING.FLASH} Kz, pagamento simulado).`,
      });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao lançar a promoção." });
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className={`rounded-lg px-4 py-3 text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">📢 Banner patrocinado</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Escolha uma posição. O banner fica ativo durante 7 dias e inclui estatísticas de impressões e cliques.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(["HERO", "HOME_MID", "LISTING_TOP"] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setBannerForm({ ...bannerForm, position: pos })}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                bannerForm.position === pos ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900">{positionLabels[pos]}</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">{bannerPrices[pos].toLocaleString("pt-AO")} Kz /semana</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-500">Título</label>
            <input
              value={bannerForm.title}
              onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="Ex.: Banco BAI — Crédito automóvel"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">URL da imagem</label>
            <input
              value={bannerForm.imageUrl}
              onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500">Link de destino</label>
            <input
              value={bannerForm.linkUrl}
              onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="https://seu-site.ao"
            />
          </div>
        </div>

        <button
          onClick={buyBanner}
          disabled={!!loading}
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading === "banner" ? "A processar..." : `Comprar banner (${bannerPrices[bannerForm.position].toLocaleString("pt-AO")} Kz)`}
        </button>
      </div>

      {banners.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="font-semibold text-zinc-900">Os meus banners</h3>
          <ul className="mt-3 space-y-2">
            {banners.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-900">{b.title}</p>
                  <p className="text-xs text-zinc-500">
                    {positionLabels[b.position] ?? b.position} · de {new Date(b.startDate).toLocaleDateString("pt-PT")} a{" "}
                    {new Date(b.endDate).toLocaleDateString("pt-PT")}
                  </p>
                  <p className="text-xs text-zinc-400">👁 {b.impressions} impressões · 🖱 {b.clicks} cliques</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  b.status === "ATIVO" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                }`}>
                  {b.status === "ATIVO" ? "Ativo" : "Pausado/Expirado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">⚡ Promoção flash</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Envie uma notificação de oferta relâmpago a utilizadores de uma província (ou todo o país). Máximo: 1 por semana.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500">Anúncio a promover</label>
            <select
              value={flashForm.listingId}
              onChange={(e) => setFlashForm({ ...flashForm, listingId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">Selecione um anúncio ativo</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Título da promoção</label>
            <input
              value={flashForm.title}
              onChange={(e) => setFlashForm({ ...flashForm, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="Ex.: Oferta relâmpago: -30% hoje!"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Província alvo (opcional)</label>
            <input
              value={flashForm.targetProvince}
              onChange={(e) => setFlashForm({ ...flashForm, targetProvince: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              placeholder="Ex.: Luanda (deixe vazio para todo o país)"
            />
          </div>
        </div>

        <button
          onClick={buyFlash}
          disabled={!!loading}
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading === "flash" ? "A enviar notificações..." : `Lançar promoção (${PRICING.FLASH.toLocaleString("pt-AO")} Kz)`}
        </button>
      </div>

      {flash.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="font-semibold text-zinc-900">As minhas promoções flash</h3>
          <ul className="mt-3 space-y-2">
            {flash.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-900">{f.title}</p>
                  <p className="text-xs text-zinc-500">
                    Alvo: {f.targetProvince ?? "Todo o país"} · {new Date(f.createdAt).toLocaleDateString("pt-PT")}
                  </p>
                  <p className="text-xs text-zinc-400">Enviada a {f.sentCount} utilizadores</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Enviada
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}