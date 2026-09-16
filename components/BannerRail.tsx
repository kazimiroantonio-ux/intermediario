"use client";

import { useEffect } from "react";

type BannerRailBanner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
};

export function BannerRail({
  banners,
  className,
}: {
  banners: BannerRailBanner[];
  className?: string;
}) {
  useEffect(() => {
    if (banners.length === 0) return;
    const t = setTimeout(() => {
      banners.forEach((b) => {
        fetch("/api/banners/impressions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id }),
        }).catch(() => {});
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [banners]);

  function trackClick(id: string) {
    fetch("/api/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "CLIQUE" }),
    }).catch(() => {});
  }

  if (banners.length === 0) return null;

  return (
    <div className={`flex w-full flex-col gap-3 ${className ?? "mb-2 mt-4"}`}>
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
            className="h-28 w-full object-cover sm:h-36"
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