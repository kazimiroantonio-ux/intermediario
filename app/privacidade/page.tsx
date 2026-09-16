export const metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Política de privacidade</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-600">
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Dados que recolhemos</h2>
          <p>
            Nome, e-mail, telefone e localização (província/município) para criar a sua conta e ligar
            compradores a vendedores. As fotografias dos anúncios são armazenadas na plataforma.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Como usamos os dados</h2>
          <p>
            Para operar o marketplace: mostrar anúncios, permitir chat entre partes, notificações sobre
            reservas e mensagens, e melhorar a segurança contra fraudes.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Partilha de dados</h2>
          <p>
            Não vendemos os seus dados. O seu telefone só é visível nos anúncios que publicar. Mensagens
            privadas não são partilhadas com terceiros.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Os seus direitos</h2>
          <p>
            Pode solicitar a correção ou eliminação da sua conta e dados a qualquer momento através de
            geral@intermediario.co.ao.
          </p>
        </section>
      </div>
    </div>
  );
}
