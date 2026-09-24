import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <h3 className="text-lg font-bold text-emerald-700">
              O Intermediário
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Tudo o que procura, num só lugar. O marketplace de Angola.
            </p>
            <div className="mt-4 flex gap-2">
              {[
                { label: "WhatsApp", href: "https://wa.me/244900000000", icon: "💬" },
                { label: "Facebook", href: "https://facebook.com/intermediario.co.ao", icon: "📘" },
                { label: "Instagram", href: "https://instagram.com/intermediario.co.ao", icon: "📸" },
                { label: "LinkedIn", href: "https://linkedin.com/company/intermediario-co-ao", icon: "💼" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-base transition-colors hover:border-emerald-500"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Categorias</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li><Link href="/listar?categoria=AUTOMOVEL" className="hover:text-emerald-700">Carros</Link></li>
              <li><Link href="/listar?categoria=IMOBILIARIO" className="hover:text-emerald-700">Imóveis</Link></li>
              <li><Link href="/listar?categoria=TERRENO" className="hover:text-emerald-700">Terrenos</Link></li>
              <li><Link href="/listar?categoria=MOTORIZADAS" className="hover:text-emerald-700">Motorizadas</Link></li>
              <li><Link href="/listar?categoria=MOVEIS" className="hover:text-emerald-700">Móveis</Link></li>
              <li><Link href="/listar?categoria=OUTROS" className="hover:text-emerald-700">Outros</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Empresa</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li><Link href="/empresas" className="hover:text-emerald-700">Empresas parceiras</Link></li>
              <li><Link href="/listar" className="hover:text-emerald-700">Todos os anúncios</Link></li>
              <li><Link href="/conta/plano" className="hover:text-emerald-700">Planos Premium</Link></li>
              <li><Link href="/conta/anuncios/novo" className="hover:text-emerald-700">Publicar anúncio</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Ajuda & Política</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li><Link href="/ajuda" className="hover:text-emerald-700">Central de ajuda</Link></li>
              <li><Link href="/termos" className="hover:text-emerald-700">Termos e condições</Link></li>
              <li><Link href="/privacidade" className="hover:text-emerald-700">Privacidade</Link></li>
              <li><Link href="/contacto" className="hover:text-emerald-700">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Contacto</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li>Luanda, Angola</li>
              <li>geral@intermediario.co.ao</li>
              <li>+244 900 000 000</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} O Intermediário — Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
