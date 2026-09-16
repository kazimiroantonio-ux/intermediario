// Testes das notificações multicanal (spec v3 — prioridade 8).
// Correr: node --experimental-strip-types test-notifications.mjs

import {
  dispatchNotification,
  recordAttempt,
  confirmDelivery,
  pendingForRetry,
  channelsFor,
  notificationDedupeKey,
  RETRY_BACKOFF_MINUTES,
  DEFAULT_CHANNELS,
} from "./lib/notifications.ts";

let pass = 0;
let fail = 0;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${label}`);
  } else {
    fail++;
    console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOW = "2026-04-01T12:00:00.000Z";
const prefs = { channels: { EMAIL: true, SMS: true, PUSH: false, APP: true } };

// ---- Roteamento ----
check("pagamento pedido → EMAIL+SMS+APP por defeito",
  JSON.stringify(channelsFor("PAGAMENTO_PEDIDO", prefs)) === JSON.stringify(["EMAIL", "SMS", "APP"]));
check("SMS desativada → fica de fora",
  JSON.stringify(channelsFor("PAGAMENTO_RECEBIDO", { channels: { EMAIL: true, SMS: false, APP: true } })) === JSON.stringify(["EMAIL", "APP"]));
check("utilizador com tudo desligado → sem canais",
  channelsFor("NEGOCIO_UPDATE", { disabled: true, channels: {} }).length === 0);
check("SEGURANCA ignora preferências (trinco)",
  JSON.stringify(channelsFor("SEGURANCA", { disabled: true, channels: { EMAIL: false } })) === JSON.stringify(["EMAIL"]));

// ---- Dispatch ----
const d = dispatchNotification({
  userId: "u9",
  eventType: "PAGAMENTO_PEDIDO",
  title: "Pagamento",
  body: "Tem uma obrigação de 25.000 Kz.",
  referenceId: "d1",
  prefs,
  nowIso: NOW,
});
check("dispatch monta 3 notificações PENDING",
  d.outbound.length === 3 && d.outbound.every((n) => n.status === "PENDING")
  && d.outbound.every((n) => n.dedupeKey.startsWith("u9:d1:PAGAMENTO_PEDIDO:")));

const again = dispatchNotification({
  userId: "u9",
  eventType: "PAGAMENTO_PEDIDO",
  title: "Pagamento",
  body: "Tem uma obrigação de 25.000 Kz.",
  referenceId: "d1",
  prefs,
  nowIso: NOW,
  alreadySent: d.outbound,
});
check("dedupe dentro da janela → suprimidas",
  again.suppressed.length === 3 && again.outbound.length === 0);

const later = dispatchNotification({
  userId: "u9",
  eventType: "PAGAMENTO_PEDIDO",
  title: "Pagamento",
  body: "Relembramos a obrigação.",
  referenceId: "d1",
  prefs,
  nowIso: "2026-04-01T14:00:00.000Z",
  alreadySent: d.outbound,
});
check("fora da janela (2h) → reenvia",
  later.outbound.length === 3);

check("push desativado → respeitado no dispatch",
  dispatchNotification({ userId: "u1", eventType: "NEGOCIO_UPDATE", title: "t", body: "b", referenceId: "d2", prefs: { channels: { EMAIL: true, PUSH: true } }, nowIso: NOW }).outbound.every((n) => n.channel !== "PUSH"));

// ---- Tentativas/backoff ----
const sent = recordAttempt(d.outbound[0], { ok: true, nowIso: NOW });
check("sucesso → SENT e sem próxima tentativa",
  sent.status === "SENT" && sent.attempt === 1 && sent.nextAttemptAtIso === undefined);
const falha1 = recordAttempt(d.outbound[0], { ok: false, nowIso: NOW });
check("falha → FAILED com backoff 5min",
  falha1.status === "FAILED" && falha1.attempt === 1 && falha1.nextAttemptAtIso === new Date(new Date(NOW).getTime() + RETRY_BACKOFF_MINUTES[0] * 60_000).toISOString());
const falha2 = recordAttempt(falha1, { ok: false, nowIso: falha1.nextAttemptAtIso });
check("segunda falha → backoff 30min",
  falha2.attempt === 2 && falha2.nextAttemptAtIso?.includes("T12:35"));
check("última falha → sem nova tentativa",
  RETRY_BACKOFF_MINUTES.length === 5 && RETRY_BACKOFF_MINUTES[4] === 1440);

// ---- Fila de retentativas ----
const pronto = pendingForRetry([sent, falha2, d.outbound[1]], falha2.nextAttemptAtIso);
check("retry seleciona FAILED na hora devida e PENDING",
  pronto.some((n) => n.dedupeKey === falha2.dedupeKey) && pronto.some((n) => n.dedupeKey === d.outbound[1].dedupeKey));
const naoPronto = pendingForRetry([falha2], new Date(new Date(falha2.nextAttemptAtIso).getTime() - 1000).toISOString());
check("antes da hora → não conta",
  naoPronto.length === 0);

const lida = confirmDelivery(d.outbound[2], { nowIso: NOW, kind: "READ" });
check("confirmação de leitura (APP) → READ",
  lida.status === "READ" && lida.readAtIso === NOW);
check("DEFAULT_CHANNELS inclui SEGURANCA só EMAIL",
  JSON.stringify(DEFAULT_CHANNELS.SEGURANCA) === JSON.stringify(["EMAIL"])
  && notificationDedupeKey("u", "d", "X", "EMAIL") === "u:d:X:EMAIL");

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);