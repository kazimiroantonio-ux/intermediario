// ---------------------------------------------------------------------------
// e2e-check.mjs — smoke test leve do servidor em execução.
//
// Uso:
//   node e2e-check.mjs                # checagens anónimas (públicas + guardas)
//   $env:E2E_EMAIL=...; $env:E2E_PASSWORD=...; node e2e-check.mjs
//                                     # + fluxo autenticado (login real via API)
//
// Validações:
//   1. Páginas públicas devolvem 200.
//   2. Rotas protegidas redirecionam (307) para /entrar.
//   3. APIs dos painéis devolvem 401 sem sessão.
//   4. Com credenciais: login → 200 nos dashboards/APIs protegidas.
// ---------------------------------------------------------------------------

import { strict as assert } from "node:assert";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS ?? 60_000);

let pass = 0;
let fail = 0;
let trivialNotes = [];

function report(name, ok, extra = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${name}${extra ? ` ${extra}` : ""}`);
  } else {
    fail++;
    console.error(`FAIL | ${name}${extra ? ` ${extra}` : ""}`);
  }
}

async function get(path, headers = {}) {
  const res = await fetch(BASE + path, {
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

function collectCookies(res) {
  return (res.headers.getSetCookie?.() ?? []).join("; ");
}

async function waitForServer(attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await get("/");
      if (res.status) return true;
    } catch (e) {
      // ainda a compilar (Next dev): aguarda e tenta de novo
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
  return false;
}

// ---------------------------------------------------------------------------
// 1. Servidor no ar
// ---------------------------------------------------------------------------

const up = await waitForServer();
report("servidor no ar", up, up ? `(${BASE})` : "(demasiadas tentativas)");
if (!up) {
  console.log(`\nArranca o dev server e corre de novo: npm run dev`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Páginas públicas → 200
// ---------------------------------------------------------------------------

for (const path of ["/", "/listar", "/entrar", "/registar", "/termos", "/privacidade", "/ajuda"]) {
  try {
    const res = await get(path);
    report(`pagina publica ${path}`, res.status === 200, `("${res.status}")`);
  } catch (e) {
    report(`pagina publica ${path}`, false, `(erro: ${e.message})`);
  }
}

// ---------------------------------------------------------------------------
// 3. Rotas protegidas → 307 para /entrar (guardas de sessão)
// ---------------------------------------------------------------------------

for (const path of ["/conta", "/conta/vendedor/dashboard", "/conta/vendedor/negocios", "/conta/agente/dashboard"]) {
  try {
    const res = await get(path);
    const loc = res.headers.get("location") ?? "";
    report(`guarda ${path}`, res.status === 307 && loc.startsWith("/entrar"), `("${res.status}" → ${loc.split("?")[0]})`);
  } catch (e) {
    report(`guarda ${path}`, false, `(erro: ${e.message})`);
  }
}

// ---------------------------------------------------------------------------
// 4. APIs dos painéis → 401 sem sessão
// ---------------------------------------------------------------------------

for (const path of ["/api/vendedor/dashboard", "/api/vendedor/comissoes", "/api/vendedor/negocios", "/api/agente/dashboard", "/api/agente/comissoes"]) {
  try {
    const res = await get(path);
    report(`api sem sessao ${path}`, res.status === 401, `("${res.status}")`);
  } catch (e) {
    report(`api sem sessao ${path}`, false, `(erro: ${e.message})`);
  }
}

// ---------------------------------------------------------------------------
// 5. Fluxo autenticado (opcional — requer E2E_EMAIL/E2E_PASSWORD)
// ---------------------------------------------------------------------------

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (email && password) {
  let jar = "";
  try {
    const signIn = await fetch(BASE + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    jar = collectCookies(signIn);
    report("login atrav\u00E9s de /api/auth/sign-in/email", signIn.status === 200, `("${signIn.status}")`);
    if (!jar) trivialNotes.push("login ok mas sem cookie retornado — fluxo autenticado ignorado");
  } catch (e) {
    report("login atrav\u00E9s de /api/auth/sign-in/email", false, `(erro: ${e.message})`);
    jar = "";
  }

  if (jar) {
    const authHeaders = { cookie: jar };
    for (const path of ["/conta/vendedor/dashboard"]) {
      try {
        const res = await get(path, authHeaders);
        report(`protegido autenticado ${path}`, res.status === 200, `("${res.status}")`);
      } catch (e) {
        report(`protegido autenticado ${path}`, false, `(erro: ${e.message})`);
      }
    }
    for (const path of ["/api/vendedor/dashboard", "/api/vendedor/comissoes"]) {
      try {
        const res = await get(path, authHeaders);
        let ok = res.status === 200;
        let extra = `("${res.status}")`;
        if (ok && path === "/api/vendedor/comissoes") {
          const body = await res.json();
          assert.ok(Array.isArray(body.items));
          extra += ` (${body.items.length} comissoes)`;
        }
        if (ok && path === "/api/vendedor/dashboard") {
          const body = await res.json();
          assert.ok(typeof body.counts === "object");
          extra += " (counts ok)";
        }
        report(`api autenticada ${path}`, ok, extra);
      } catch (e) {
        report(`api autenticada ${path}`, false, `(erro: ${e.message})`);
      }
    }
  }
} else {
  trivialNotes.push("E2E_EMAIL/E2E_PASSWORD nao definidos — fluxo autenticado omitido");
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

for (const n of trivialNotes) console.log(`NOTA | ${n}`);
console.log(`\nResultado: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);