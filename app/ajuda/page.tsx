export const metadata = { title: "Central de ajuda" };

const FAQS = [
  {
    q: "Como publico um anúncio?",
    a: "Crie a sua conta gratuita, clique em 'Publicar Anúncio', preencha a informação do bem, adicione fotos e publique. É grátis.",
  },
  {
    q: "O Intermediário cobra comissões?",
    a: "A publicação é grátis. Cobramos apenas uma pequena taxa de intermediação quando o negócio é concluído através da plataforma.",
  },
  {
    q: "Como funciona o selo de vendedor verificado?",
    a: "Vendedores verificados passaram por uma validação de identidade ou documentos da empresa. Procure o símbolo ✔ nos anúncios.",
  },
  {
    q: "Como reservo um bem para aluguer?",
    a: "Nos anúncios de aluguer, escolha as datas no calendário e solicite a reserva. O proprietário recebe a notificação e confirma.",
  },
  {
    q: "Como denuncio um anúncio suspeito?",
    a: "Na página do anúncio, clique em 'Denunciar anúncio' e escolha o motivo. A nossa equipa analisa todas as denúncias.",
  },
];

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Central de ajuda</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Respostas às perguntas mais frequentes sobre a plataforma.
      </p>
      <div className="mt-8 space-y-4">
        {FAQS.map((f) => (
          <details key={f.q} className="rounded-xl border border-zinc-200 bg-white p-5 open:shadow-sm">
            <summary className="cursor-pointer font-semibold text-zinc-900">{f.q}</summary>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
