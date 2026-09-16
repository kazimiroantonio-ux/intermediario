// ---------------------------------------------------------------------------
// (Prioridade 12) Automações adicionais — jobs determinísticos por relógio.
// Dados puros em → ações explícitas (outbox). Idempotente: os mesmos inputs
// produzem as mesmas ações; `doneKeys` impede re-triggers confirmados.
// Auditável e reversível (as transições continuam a passar pela máquina).
// ---------------------------------------------------------------------------

import type { VerificationCase } from "./verificationWorkflow.ts";
import type { Refund } from "./refundWorkflow.ts";
import type { Payment } from "./paymentWorkflow.ts";

export interface AutomatableListing {
  id: string;
  status: string;
  expiresAtIso?: string;
  lastReminderSentAtIso?: string;
}

export interface AutomatableSubscription {
  userId: string;
  plan: string;
  expiresAtIso?: string;
}

export type JobActionType =
  | "LISTING_EXPIRE"
  | "VERIFICATION_ESCALATE"
  | "VERIFICATION_REMIND"
  | "REFUND_ESCALATE"
  | "PAYMENT_REMIND"
  | "PAYMENT_RECONCILE_REMIND"
  | "SUBSCRIPTION_DOWNGRADE";

export interface JobAction {
  type: JobActionType;
  entityId: string;
  entityType: string;
  atIso: string;
  reason: string;
  auto: true; // gerada por sistema; ainda precisa de gate da máquina/estado
}

export interface JobRun {
  nowIso: string;
  actions: JobAction[];
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

/**
 * Corre os jobs. Parâmetros:
 * - `doneKeys`: "type:entityId" já executados nesta janela (idempotência).
 * - `verificationReminderDays`/`refundEscalateDays`: prazos ("batimento").
 */
export function runScheduledJobs(input: {
  nowIso: string;
  listings: AutomatableListing[];
  verifications: VerificationCase[];
  refunds: Refund[];
  payments: Payment[];
  subscriptions: AutomatableSubscription[];
  doneKeys?: string[];
  verificationReminderDays?: number;
  refundEscalateDays?: number;
  paymentReminderDays?: number;
}): JobRun {
  const nowIso = input.nowIso;
  const done = new Set(input.doneKeys ?? []);
  const actions: JobAction[] = [];
  const push = (type: JobActionType, entityId: string, entityType: string, reason: string) => {
    const key = `${type}:${entityId}`;
    if (done.has(key)) return;
    done.add(key);
    actions.push({ type, entityId, entityType, atIso: nowIso, reason, auto: true });
  };

  for (const l of input.listings) {
    if (l.status === "ACTIVE" && l.expiresAtIso && nowIso >= l.expiresAtIso) {
      push("LISTING_EXPIRE", l.id, "LISTING", `Anúncio ${l.id} expirou em ${l.expiresAtIso}.`);
    }
  }

  const verifRemindDays = input.verificationReminderDays ?? 2;
  for (const v of input.verifications) {
    if (v.status === "VERIFIED" || v.status === "REJECTED") continue;
    const deadline = v.deadlineIso;
    if (!deadline) continue;
    if (nowIso >= deadline) {
      push("VERIFICATION_ESCALATE", v.id, "VERIFICATION", `Verificação ${v.id} ultrapassou o prazo (${deadline}).`);
    } else if (nowIso >= addDays(deadline, -verifRemindDays)) {
      push("VERIFICATION_REMIND", v.id, "VERIFICATION", `Verificação ${v.id} aproxima-se do prazo (${deadline}).`);
    }
  }

  for (const r of input.refunds) {
    if (r.status === "REEMBOLSADO" || r.status === "REJEITADO" || r.status === "CANCELADO") continue;
    if (nowIso >= r.deadlineIso) {
      push("REFUND_ESCALATE", r.id, "REFUND", `Reembolso ${r.id} ultrapassou o prazo (${r.deadlineIso}).`);
    }
  }

  const paymentRemindDays = input.paymentReminderDays ?? 3;
  for (const p of input.payments) {
    if (p.phase === "AGUARDA_PAGAMENTO" && p.dueIso && nowIso >= p.dueIso) {
      push("PAYMENT_REMIND", p.id, "PAYMENT", `Pagamento ${p.id} em atraso desde ${p.dueIso}.`);
    }
    if (p.phase === "RECEBIDO" && p.receivedAt && nowIso >= addDays(p.receivedAt, 2)) {
      push("PAYMENT_RECONCILE_REMIND", p.id, "PAYMENT", `Pagamento ${p.id} recebido há 2 dias — reconciliar.`);
    }
  }

  for (const s of input.subscriptions) {
    if (s.plan === "FREE") continue;
    if (s.expiresAtIso && nowIso >= s.expiresAtIso) {
      push("SUBSCRIPTION_DOWNGRADE", s.userId, "USER", `Plano ${s.plan} expirou em ${s.expiresAtIso}.`);
    }
  }

  return { nowIso, actions };
}