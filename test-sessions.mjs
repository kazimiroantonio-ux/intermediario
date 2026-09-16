// Testes da gestão de sessões (spec v3 §5) — node --experimental-strip-types test-sessions.mjs
import {
  parseUserAgent,
  deviceLabel,
  approximateLocation,
  sessionListView,
  planRevokeOthers,
  planRevokeOne,
} from "./lib/sessions.ts";

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  if (ok) { pass++; console.log(`PASS | ${label}`); }
  else { fail++; console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`); }
};

const mk = (i, over = {}) => ({
  id: `s${i}`,
  token: `token-${i}`,
  ipAddress: over.ipAddress ?? "127.0.0.1",
  userAgent: over.userAgent ?? "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0",
  createdAt: "2026-04-01T08:00:00.000Z",
  updatedAt: over.updatedAt ?? "2026-04-10T09:00:00.000Z",
  expiresAt: "2026-04-20T00:00:00.000Z",
  ...over,
});

// 1) User-Agent → dispositivo
const chrome = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36");
check("UA Chrome/Windows", chrome.browser === "Chrome" && chrome.os === "Windows 10/11" && !chrome.mobile);
const safari = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1");
check("UA Safari/iOS telemóvel", safari.browser === "Safari" && safari.os === "iOS" && safari.mobile);
const firefox = parseUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0");
check("UA Firefox/Linux", firefox.browser === "Firefox" && firefox.os === "Linux" && !firefox.mobile);
const edge = parseUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0");
check("UA Edge", edge.browser === "Edge" && !edge.mobile);
const vazio = parseUserAgent(null);
check("UA vazio → desconhecido", vazio.browser === "Navegador desconhecido" && vazio.os === "Sistema desconhecido");
check("deviceLabel telemóvel", deviceLabel(safari) === "Safari · iOS · Telemóvel");
check("deviceLabel desktop", deviceLabel(chrome) === "Chrome · Windows 10/11");

// 2) Localização aproximada
check("IP loopback", approximateLocation("127.0.0.1") === "Este dispositivo (loopback)");
check("IPv6 loopback", approximateLocation("::1") === "Este dispositivo (loopback)");
check("IP 10.x privado", approximateLocation("10.1.2.3") === "Rede privada");
check("IP 192.168 privado", approximateLocation("192.168.1.99") === "Rede privada");
check("IP 172.16-31 privado", approximateLocation("172.20.0.5") === "Rede privada");
check("IP link-local v4", approximateLocation("169.254.10.10") === "Rede de link-local");
check("IP fe80 link-local", approximateLocation("fe80::1aa2:bb33") === "Rede de link-local");
check("IP público", approximateLocation("41.217.99.12") === "IP público");
check("IP nulo", approximateLocation(null) === "Localização desconhecida");

// 3) Lista com marcação da sessão atual
const three = [
  mk(1, { updatedAt: "2026-04-08T10:00:00.000Z" }),
  mk(2, { updatedAt: "2026-04-10T09:00:00.000Z", token: "token-atual" }),
  mk(3, { updatedAt: "2026-04-09T11:00:00.000Z" }),
];
const view = sessionListView(three, "token-atual");
check("lista ordena por último acesso (desc)", view.map((v) => v.id).join(",") === "s2,s3,s1");
const cur = view.find((v) => v.isCurrent);
check("sessão atual marcada", !!cur && cur.id === "s2", JSON.stringify(view.map(v => ({ id: v.id, cur: v.isCurrent }))));
check("exatamente uma sessão atual", view.filter((v) => v.isCurrent).length === 1);
check("DTO não expõe token", !("token" in view[0]));
check("DTO tem campos de visualização", view[0].device.length > 0 && view[0].location === "Este dispositivo (loopback)" && view[0].browser === "Chrome");
check("sem token atual → nenhuma atual", sessionListView(three, undefined).every((v) => !v.isCurrent));
check("cada linha com o token atual fica marcada", sessionListView([mk(1, { token: "t" }), mk(2, { token: "t" })], "t").every((v) => v.isCurrent));
check("linha com outro token não fica marcada", sessionListView([mk(1, { token: "a" }), mk(2, { token: "b" })], "a").map((v) => v.isCurrent).join(",") === "true,false");

// 4) Revogar todas as outras — nunca inclui a atual
const others = planRevokeOthers(three, "token-atual");
check("revogar outras exclui a atual", !others.includes("token-atual"));
check("revogar outras inclui as restantes", others.sort().join(",") === "token-1,token-3");
check("revogar outras não duplica", planRevokeOthers([...three, mk(4, { token: "token-1" })], "token-atual").sort().join(",") === "token-1,token-3");
check("revogar outras com sessão única → lista vazia", planRevokeOthers([mk(1, { token: "x" })], "x").length === 0);
check("revogar outras cobre tokens únicos", new Set(planRevokeOthers([mk(1, { token: "a" }), mk(2, { token: "a" }), mk(3, { token: "x" })], "x")).size === 1);

// 5) Revogar uma sessão específica — bloqueia a atual
const one = planRevokeOne(three, "token-atual", "s3");
check("revogar específica ok", one.ok && one.tokens[0] === "token-3");
const oneCurrent = planRevokeOne(three, "token-atual", "s2");
check("revogar a atual é recusada", !oneCurrent.ok && oneCurrent.ok === false ? true : false);
check("revogar a atual não devolve tokens", oneCurrent.ok === false ? (oneCurrent.tokens === undefined) : true);
const oneMissing = planRevokeOne(three, "token-atual", "s99");
check("revogar inexistente é recusada", !oneMissing.ok && oneMissing.reason === "Sessão não encontrada.");

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);