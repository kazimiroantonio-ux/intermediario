export const metadata = { title: "Termos e condições" };

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Termos e condições</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-600">
        <section>
          <h2 className="text-base font-semibold text-zinc-900">1. Aceitação</h2>
          <p>
            Ao utilizar o site O Intermediário, o utilizador aceita estes termos. A plataforma atua como
            intermediário digital entre vendedores e compradores, não sendo proprietária dos bens anunciados.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">2. Contas</h2>
          <p>
            É obrigatório fornecer informação verdadeira. Cada utilizador é responsável pela sua conta e pelo
            conteúdo que publica. Contas empresariais devem representar empresas legalmente constituídas em Angola.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">3. Anúncios</h2>
          <p>
            É proibido publicar bens ilegais, falsificados ou anúncios enganosos. A administração pode remover
            anúncios que violem as regras e suspender contas reincidentes.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">4. Transações</h2>
          <p>
            Recomendamos encontrar-se em locais seguros e verificar os bens antes de pagar. A taxa de intermediação
            aplica-se apenas a negócios concluídos através da plataforma.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-zinc-900">5. Contacto</h2>
          <p>Dúvidas sobre estes termos: geral@intermediario.co.ao.</p>
        </section>
      </div>
    </div>
  );
}
