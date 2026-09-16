// ---------------------------------------------------------------------------
// Autorização do painel do agente (Fase 2, bloco 2).
// Decisão pura: 401 sem sessão, 403 com sessão sem permissão.
// O agente é SEMPRE derivado da sessão (userId) — nunca do cliente.
// A role canónica é o enum Role do schema (USER | VERIFIED_SELLER | PRO |
// ENTERPRISE | AGENT | ADMIN), tal como nas rotas /admin. O accessPolicy.ts
// (operatorRole) é o sistema de funções operacionais da consola v3 e não se
// aplica a este painel. Não existe MANAGER no schema.
// ---------------------------------------------------------------------------

export const AGENT_ROLE = "AGENT";

export type AgentAccessResult =
  | { ok: true; agentId: string }
  | { ok: false; status: 401 | 403; reason: string };

export function authorizeAgent(
  session: { user: { role?: string | null } } | null,
  agent: { id: string } | null
): AgentAccessResult {
  if (!session) {
    return { ok: false, status: 401, reason: "Inicie sessão para aceder." };
  }
  if (session.user.role !== AGENT_ROLE) {
    return { ok: false, status: 403, reason: "Acesso reservado a agentes." };
  }
  if (!agent) {
    return { ok: false, status: 403, reason: "Perfil de agente não encontrado." };
  }
  return { ok: true, agentId: agent.id };
}

/** Estados com que o agente ainda pode operar normalmente no painel. */
export const AGENT_OPERATIONAL_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
] as const;

/** Estados de pagamento que contam como "pedido pendente" (bloqueiam nova solicitação). */
export const PAYOUT_PENDING_STATUSES = ["DRAFT", "APPROVED", "PROCESSING"] as const;