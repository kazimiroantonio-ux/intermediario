"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Gallery({
  images,
  title,
  fallback = "",
}: {
  images: { id: string; url: string; alt: string | null }[];
  title: string;
  fallback?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [images]);

  const list =
    images.length === 0 && fallback
      ? [{ id: "fallback", url: fallback, alt: title }]
      : images;

  if (list.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center text-6xl text-zinc-300">
        📦
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={list[active].url}
          alt={list[active].alt ?? title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-1 border-t border-zinc-200 p-1 sm:grid-cols-8">
          {list.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg transition-all ${
                i === active ? "ring-2 ring-emerald-600" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={img.alt ?? title} fill sizes="15vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
