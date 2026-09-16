// ---------------------------------------------------------------------------
// Rótulos de apresentação do painel do vendedor (camada de apresentação).
// Chaves = valores EXATOS dos enums do schema (confirmados em schema.prisma).
// Never import on business-logic modules.
// ---------------------------------------------------------------------------

// ReservationStatus: PENDING | CONFIRMED | REJECTED | CANCELLED
export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

// DealType: VENDA | ALUGUER
export const DEAL_TYPE_LABEL: Record<string, string> = {
  VENDA: "Venda",
  ALUGUER: "Arrendamento",
};

// Reutilizados do módulo do agente (labels de comissão + formatação).
export { COMMISSION_STATUS_LABEL, formatCentsToKz } from "./agent-labels";
