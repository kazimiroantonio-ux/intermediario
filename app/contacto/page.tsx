export const metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Contacto</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Estamos disponíveis para ajudar utilizadores e empresas parceiras.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">📞 Telefone</h2>
          <p className="mt-2 text-sm text-zinc-600">+244 900 000 000</p>
          <p className="text-xs text-zinc-400">Seg–Sáb, 08h–18h</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">💬 WhatsApp</h2>
          <a
            href="https://wa.me/244900000000"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
          >
            Falar no WhatsApp
          </a>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">✉️ E-mail</h2>
          <p className="mt-2 text-sm text-zinc-600">geral@intermediario.co.ao</p>
          <p className="text-xs text-zinc-400">Resposta em até 24h úteis</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">📍 Escritório</h2>
          <p className="mt-2 text-sm text-zinc-600">Luanda, Angola</p>
          <p className="text-xs text-zinc-400">Visitas mediante marcação</p>
        </div>
      </div>
    </div>
  );
}
