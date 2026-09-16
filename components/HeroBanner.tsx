"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=70",
    title: "Compre ou venda carros com segurança.",
    desc: "Milhares de veículos verificados em todas as províncias de Angola.",
    cta: "Ver carros",
    href: "/listar?categoria=AUTOMOVEL",
  },
  {
    image:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1600&q=70",
    title: "Encontre a casa ideal.",
    desc: "Apartamentos, vivendas e escritórios para comprar ou alugar.",
    cta: "Ver imóveis",
    href: "/listar?categoria=IMOBILIARIO",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=70",
    title: "Terrenos em todas as províncias.",
    desc: "Lotes urbanos, agrícolas e quintas com documentação verificada.",
    cta: "Ver terrenos",
    href: "/listar?categoria=TERRENO",
  },
];

export function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-[300px] overflow-hidden sm:h-[420px] lg:h-[500px]">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.href}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-900/55 to-zinc-900/25" />
          <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 text-center text-white sm:items-start sm:text-left">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              O marketplace de Angola
            </span>
            <h1 className="mt-4 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-lg sm:text-4xl lg:text-5xl">
              {slide.title}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/90 drop-shadow sm:mt-3 sm:text-lg">
              {slide.desc}
            </p>
            <Link
              href={slide.href}
              className="mt-5 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold shadow-xl transition-transform hover:scale-105 hover:bg-emerald-400 sm:mt-7 sm:px-8 sm:py-3.5 sm:text-base"
            >
              {slide.cta}
            </Link>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-5">
        {SLIDES.map((s, i) => (
          <button
            key={s.href}
            onClick={() => setIndex(i)}
            aria-label={`Banner ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
