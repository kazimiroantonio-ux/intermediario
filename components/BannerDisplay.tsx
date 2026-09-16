"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
};

export function BannerDisplay({ position }: { position: "HERO" | "HOME_MID" | "LISTING_TOP" }) {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/banners?position=${position}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setBanners(data.banners ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [position]);

  async function trackClick(id: string) {
    fetch("/api/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "CLIQUE" }),
    }).catch(() => {});
  }

  async function trackImpression(id: string) {
    fetch("/api/banners/impressions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (banners.length > 0) {
      const t = setTimeout(() => {
        banners.forEach((b) => trackImpression(b.id));
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [banners]);

  if (banners.length === 0) {
    if (position === "HERO") return null;
    return null;
  }

  return (
    <div className={position === "HERO" ? "mb-6" : "my-6"}>
      {banners.map((b) => (
        <a
          key={b.id}
          href={b.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(b.id)}
          className="group relative block overflow-hidden rounded-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.imageUrl}
            alt={b.title}
            className="h-24 w-full object-cover sm:h-32"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Patrocinado
          </span>
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {b.title}
          </span>
        </a>
      ))}
    </div>
  );
}