"use client";

import { useApi } from "@/components/useApi";
import { Card, ErrorBox, LoadingBox } from "@/components/agent-ui";

type PerfilData = {
  profile: {
    payoutMethod: string;
    taxRegime: string;
    bankName: string | null;
    ibanMasked: string | null;
    commissionShareBps: number;
    phone: string;
  };
};

const PAYOUT_METHOD_LABEL: Record<string, string> = {
  MULTICAIXA: "Multicaixa",
  BANK_TRANSFER: "Transferência bancária",
};

const TAX_REGIME_LABEL: Record<string, string> = {
  INDIVIDUAL_GROUP_C: "Pessoa singular (Grupo C)",
  COMPANY_GENERAL: "Empresa (Regime geral)",
  COMPANY_SIMPLIFIED: "Empresa (Regime simplificado)",
};

export default function DefinicoesPage() {
  const { data, error, loading, reload } = useApi<PerfilData>("/api/agente/perfil");

  if (loading) return <LoadingBox label="A carregar definições..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <LoadingBox label="Sem definições." />;

  const p = data.profile;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Pagamento" icon="💸">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Método de pagamento</dt>
            <dd className="font-medium text-zinc-900">{PAYOUT_METHOD_LABEL[p.payoutMethod] ?? p.payoutMethod}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Banco</dt>
            <dd className="font-medium text-zinc-900">{p.bankName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">IBAN</dt>
            <dd className="font-medium text-zinc-900">{p.ibanMasked ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Share de comissão</dt>
            <dd className="font-medium text-zinc-900">{(p.commissionShareBps / 100).toFixed(0)}%</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-400">
          Segurança: o IBAN nunca é exibido por completo. Para o alterar, contacte o suporte.
        </p>
      </Card>

      <Card title="Fiscalidade" icon="🧾">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Regime fiscal</dt>
            <dd className="font-medium text-zinc-900">{TAX_REGIME_LABEL[p.taxRegime] ?? p.taxRegime}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Telemóvel de contacto</dt>
            <dd className="font-medium text-zinc-900">{p.phone}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-400">
          A retenção na fonte, quando aplicável, é deduzida no valor líquido do pagamento.
        </p>
      </Card>

      <Card title="Notificações" icon="🔔">
        <p className="text-sm text-zinc-600">
          As preferências de notificação por canais (e-mail/SMS) ainda não são suportadas nesta fase.
          Receberá notificações automáticas de novos negócios e do estado dos seus pagamentos.
        </p>
      </Card>
    </div>
  );
}