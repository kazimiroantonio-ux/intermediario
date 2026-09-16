// ---------------------------------------------------------------------------
// Rótulos de apresentação do painel do agente (camada de apresentação).
// Chaves = valores EXATOS dos enums do schema (confirmados em schema.prisma).
// Nunca importar estes mapas na lógica de negócio.
// ---------------------------------------------------------------------------

// AgentStatus: PENDING_REVIEW | APPROVED | SUSPENDED | REJECTED | INACTIVE
export const AGENT_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  SUSPENDED: "Suspenso",
  REJECTED: "Rejeitado",
  INACTIVE: "Inativo",
};

// CommissionStatus: PENDING | ACCRUED | PAYABLE | PAID | REVERSED | DISPUTED
export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACCRUED: "Acumulada",
  PAYABLE: "Disponível",
  PAID: "Paga",
  REVERSED: "Estornada",
  DISPUTED: "Em disputa",
};

// PayoutStatus: DRAFT | APPROVED | PROCESSING | PAID | FAILED
export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "A aguardar aprovação",
  APPROVED: "Aprovado",
  PROCESSING: "Em processamento",
  PAID: "Pago",
  FAILED: "Falhou",
};

// BankAccountStatus: PENDENTE | EM_VERIFICACAO | VERIFICADO | REJEITADO | SUSPENSO | SUBSTITUIDO
export const BANK_ACCOUNT_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_VERIFICACAO: "Em verificação",
  VERIFICADO: "Verificado",
  REJEITADO: "Rejeitado",
  SUSPENSO: "Suspenso",
  SUBSTITUIDO: "Substituído",
};

/**
 * Mascara um IBAN para exibição: mostra apenas os últimos 4 caracteres.
 * Nunca exibir o IBAN completo na interface.
 */
export function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const trimmed = iban.replace(/\s+/g, "");
  if (trimmed.length <= 4) return "••••";
  return "•••• " + trimmed.slice(-4);
}

/**
 * Formata cêntimos AOA como Kwanza ("AOA 10 000"). Chama o mesmo Intl do
 * resto da aplicação; aceita bigint/string/number (cêntimos).
 */
export function formatCentsToKz(minor: bigint | string | number): string {
  const cents = typeof minor === "bigint" ? Number(minor) : Number(minor);
  if (Number.isNaN(cents)) return "AOA 0";
  return "AOA " + new Intl.NumberFormat("pt-AO", {
    maximumFractionDigits: 0,
  }).format(cents / 100);
}