// ---------------------------------------------------------------------------
// Autorização por função (spec v3 sec. 4 — OWASP ASVS 4.1 / BOLA-BFLA).
// Dois pontos:
//   1) MATRIZ estática: que recurso+ação cada função operacional pode executar.
//   2) Separação de funções (four-eyes): ninguém aprova o próprio pedido, e
//      ações de alto risco exigem funções diferentes (ex.: reembolso alto =
//      FINANCEIRO + SUPERVISOR).
// As rotas combinam isto com o ESCOPO do objeto (negócio/agente/dono) — um
// agente autenticado só acede a `Deal` onde está associado.
// ---------------------------------------------------------------------------

export type OperatorRoleName =
  | "AGENT"
  | "VERIFICADOR"
  | "FINANCEIRO"
  | "COMPLIANCE"
  | "SUPERVISOR"
  | "ADMIN_TECNICO"
  | "ADMIN_PRINCIPAL";

export type PermissionCode =
  | "listings.view"
  | "listings.verify"
  | "listings.approve"
  | "listings.block"
  | "sellers.verify"
  | "deals.view"
  | "deals.create"
  | "deals.override"
  | "documents.view"
  | "documents.approve"
  | "documents.reject"
  | "documents.sign"
  | "payments.reconcile"
  | "refunds.create"
  | "refunds.approve"
  | "aml.review"
  | "aml.approve"
  | "users.manage"
  | "audit.view"
  | "audit.export"
  | "config.manage"
  | "ai.manage"
  | "ai.approve";

// Matriz recurso+ação por função operacional (spec v3 sec. 4).
const S = (codes: PermissionCode[]) => codes as readonly PermissionCode[];

export const PERMISSION_MATRIX: Record<OperatorRoleName, readonly PermissionCode[]> = {
  // Agente: gere clientes e visitas. NUNCA liberta fundos nem decide compliance.
  AGENT: S(["listings.view", "deals.view", "deals.create", "deals.override"]),
  // Verificador: analisa documentos/anúncios. Não toca em pagamentos/reembolsos.
  VERIFICADOR: S(["listings.view", "listings.verify", "sellers.verify", "documents.view", "documents.reject"]),
  // Financeiro: confirma pagamentos e reembolsos. Não aprova documentos jurídicos.
  FINANCEIRO: S(["deals.view", "payments.reconcile", "refunds.create", "refunds.approve", "audit.view"]),
  // Compliance: risco, KYC, AML. Não altera valores sem trilho.
  COMPLIANCE: S([
    "listings.view", "listings.block", "deals.view",
    "documents.view", "documents.reject",
    "aml.review", "aml.approve",
    "ai.approve", "audit.view",
  ]),
  // Supervisor: revê exceções e dá a 2.ª aprovação em reembolsos altos.
  SUPERVISOR: S(["deals.override", "listings.block", "refunds.approve", "aml.review", "audit.view"]),
  // Admin técnico: configura o sistema; NÃO consulta documentos sem justificação.
  ADMIN_TECNICO: S(["config.manage", "users.manage", "audit.view", "audit.export", "ai.manage"]),
  // Admin principal: gestão global; nunca apaga auditoria; controlos críticos
  // exigem dupla aprovação — por isso nem tudo automático.
  ADMIN_PRINCIPAL: S([
    "listings.view", "listings.verify", "listings.approve", "listings.block", "sellers.verify",
    "deals.view", "deals.create",
    "documents.view", "documents.approve", "documents.reject", "documents.sign",
    "payments.reconcile",
    "refunds.create", "refunds.approve",
    "aml.review", "aml.approve",
    "users.manage", "audit.view", "audit.export", "config.manage",
    "ai.manage", "ai.approve",
  ]),
};

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  missing?: PermissionCode;
}

/** 1) Matriz: a função pode executar recurso.ação? */
export function can(u: { operatorRole?: OperatorRoleName | null }, resource: string, action: string): AccessDecision {
  if (!u.operatorRole) {
    return { allowed: false, reason: "Sem função operacional atribuída." };
  }
  const permission = `${resource}.${action}` as PermissionCode;
  const codes = PERMISSION_MATRIX[u.operatorRole] ?? [];
  if (codes.includes(permission)) return { allowed: true };
  return { allowed: false, reason: `Função ${u.operatorRole} não pode fazer ${resource}.${action}.`, missing: permission };
}

// ---------------------------------------------------------------------------
// 2) Separação de funções (four-eyes) — spec v3 sec. 4 e 8.
// ---------------------------------------------------------------------------

/** Ações em que a aprovação exige sempre funções DIFERENTES do requerente. */
export const FOUR_EYES_HIGH_RISK: readonly PermissionCode[] = S([
  "refunds.approve",
  "deals.override",
  "aml.approve",
  "listings.block",
]);

/**
 * Regra four-eyes: o aprovador não pode ser o requerente; e em ações de alto
 * risco os papéis têm de ser diferentes (mesmo pedido → segunda pessoa com
 * outra função). Devolve o motivo de bloqueio, se houver.
 */
export function validateFourEyes(input: {
  requestedById?: string | null;
  requesterRole?: OperatorRoleName | null;
  approvedById?: string | null;
  approverRole?: OperatorRoleName | null;
  permission: PermissionCode;
}): { ok: boolean; reason?: string } {
  if (!input.approvedById) {
    return { ok: false, reason: "Sem aprovador registado." };
  }
  if (input.requestedById && input.approvedById === input.requestedById) {
    return { ok: false, reason: "Four-eyes: o requerente não pode aprovar o próprio pedido." };
  }
  if (!input.requesterRole) {
    return { ok: false, reason: "Four-eyes: falta a função do requerente." };
  }
  if (FOUR_EYES_HIGH_RISK.includes(input.permission) && input.approverRole === input.requesterRole) {
    return { ok: false, reason: `Four-eyes: ${input.permission} exige funções diferentes de ${input.requesterRole}.` };
  }
  return { ok: true };
}