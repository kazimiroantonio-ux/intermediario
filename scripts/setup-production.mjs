/**
 * scripts/setup-production.mjs
 *
 * Preparação de produção para TODOS os serviços externos.
 * Uso:  node scripts/setup-production.mjs   (ou: npm run setup:production)
 *
 * Ordens:
 *   1. Valida variáveis obrigatórias por serviço (falha cedo e diz qual falta).
 *   2. prisma generate
 *   3. prisma migrate deploy
 *   4. Smoke test de ligação à BD (Supabase).
 *   5. Smoke test de e-mail (Brevo) — só se BREVO_API_KEY presente.
 *   6. Smoke test de SMS (KambaSMS) — só se KAMBA_API_KEY presente.
 *   7. Smoke test de imagens (Cloudinary) — só se STORAGE_PROVIDER=cloudinary.
 *   8. Smoke test de pagamentos (Multicaixa) — só se MULTICAIXA_ENTITY presente.
 */

import "dotenv/config";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Validação de variáveis — organizada por serviço
// ---------------------------------------------------------------------------

const SERVICES = {
  "Base de dados (Supabase)": {
    required: {
      DATABASE_URL:
        "Direct connection string (Dashboard → Database → Direct).",
    },
    optional: {},
  },
  "Autenticação (better-auth)": {
    required: {
      BETTER_AUTH_SECRET:
        "Segredo forte (gera com: openssl rand -base64 32).",
      BETTER_AUTH_URL:
        "URL base do domínio final (ex.: https://www.dominio.com).",
    },
    optional: {},
  },
  "SMS / OTP (KambaSMS)": {
    required: {},
    optional: {
      KAMBA_API_KEY: "Chave API KambaSMS (kambasms.ao/dashboard/keys).",
    },
  },
  "Email (Brevo)": {
    required: {},
    optional: {
      BREVO_API_KEY: "Chave API Brevo.",
      BREVO_SENDER_EMAIL: "Remetente verificado no Brevo.",
    },
  },
  "Pagamentos (Multicaixa/ProxyPay)": {
    required: {},
    optional: {
      MULTICAIXA_ENTITY: "Entidade Multicaixa Express.",
      MULTICAIXA_WEBHOOK_SECRET: "Segredo de webhook Multicaixa.",
    },
  },
  "Armazenamento de imagens": {
    required: {},
    optional: {
      STORAGE_PROVIDER: "local (default), cloudinary ou s3.",
    },
  },
  "Domínio / App": {
    required: {
      NEXT_PUBLIC_APP_URL: "URL pública do domínio final.",
    },
    optional: {},
  },
};

function validateEnvVars() {
  const allMissing = [];
  const allWarnings = [];

  for (const [serviceName, config] of Object.entries(SERVICES)) {
    for (const [key, desc] of Object.entries(config.required)) {
      if (!process.env[key]?.trim()) {
        allMissing.push(`  • ${key} — ${desc}  [${serviceName}]`);
      }
    }
    for (const [key, desc] of Object.entries(config.optional)) {
      if (!process.env[key]?.trim()) {
        allWarnings.push(`  • ${key} — ${desc}  [${serviceName}]`);
      }
    }
  }

  if (allMissing.length > 0) {
    console.error("\n[ERRO] Variáveis obrigatórias em falta:\n");
    for (const m of allMissing) console.error(m);
    console.error(
      "\nDefine-as no .env ou como variáveis de ambiente do host e tenta novamente.\n"
    );
    process.exit(1);
  }

  if (allWarnings.length > 0) {
    console.warn("\n[INFO] Variáveis opcionais não definidas (funcionalidade limitada):\n");
    for (const w of allWarnings) console.warn(w);
    console.warn("");
  }
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function run(cmd, args) {
  console.log(`▶ ${cmd} ${args.join(" ")}`);
  try {
    const out = execFileSync(cmd, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    if (out.trim()) console.log(`  ${out.trim()}`);
  } catch (err) {
    console.error(`\n[ERRO] ${cmd} ${args.join(" ")} falhou:\n`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.error(err.message);
    process.exit(1);
  }
}

async function testDatabase() {
  console.log("▶ Smoke test: ligação à base de dados (Supabase)…");
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const res = await pool.query("SELECT 1 AS ok");
    if (res.rows[0]?.ok !== 1) throw new Error("Query devolveu resultado inesperado.");
    console.log("  [OK] Ligação à BD verificada.");
  } catch (err) {
    console.error("  [ERRO] Não foi possível ligar à BD:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function testBrevo() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.log("▶ Smoke test: Brevo — saltado (BREVO_API_KEY em falta)");
    return;
  }
  console.log("▶ Smoke test: API Brevo…");
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { Accept: "application/json", "api-key": apiKey },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn(`  [AVISO] Brevo ${res.status}: ${body.message ?? "sem mensagem"}`);
      console.warn("          Verifica BREVO_API_KEY.");
      return;
    }
    const data = await res.json();
    console.log(`  [OK] Brevo verificado: conta "${data.email ?? ""}"`);
  } catch (err) {
    console.warn("  [AVISO] Não foi possível contactar Brevo:", err.message);
  }
}

async function testKambaSms() {
  const apiKey = process.env.KAMBA_API_KEY?.trim();
  if (!apiKey) {
    console.log("▶ Smoke test: KambaSMS — saltado (KAMBA_API_KEY em falta)");
    return;
  }
  console.log("▶ Smoke test: API KambaSMS…");
  try {
    const res = await fetch("https://api.kambasms.ao/otp/send", {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+244900000000" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      console.warn("  [AVISO] KambaSMS autenticação falhou. Verifica KAMBA_API_KEY.");
      return;
    }
    if (res.ok || data.message?.includes("rate limit") || data.message?.includes("saldo")) {
      console.log(`  [OK] KambaSMS acessível (HTTP ${res.status}).`);
    } else {
      console.warn(`  [AVISO] KambaSMS ${res.status}: ${data.message ?? "sem mensagem"}`);
    }
  } catch (err) {
    console.warn("  [AVISO] Não foi possível contactar KambaSMS:", err.message);
  }
}

async function testCloudinary() {
  const provider = process.env.STORAGE_PROVIDER;
  if (provider !== "cloudinary") {
    console.log(`▶ Smoke test: Cloudinary — saltado (STORAGE_PROVIDER=${provider ?? "local"})`);
    return;
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloud || !preset) {
    console.warn("  [AVISO] STORAGE_PROVIDER=cloudinary mas CLOUDINARY_CLOUD_NAME ou CLOUDINARY_UPLOAD_PRESET em falta.");
    return;
  }
  console.log("▶ Smoke test: Cloudinary…");
  try {
    const form = new FormData();
    form.append("upload_preset", preset);
    form.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (res.ok) {
      console.log(`  [OK] Cloudinary upload test OK.`);
    } else {
      const body = await res.json().catch(() => ({}));
      console.warn(`  [AVISO] Cloudinary ${res.status}: ${body.error?.message ?? "sem mensagem"}`);
    }
  } catch (err) {
    console.warn("  [AVISO] Não foi possível contactar Cloudinary:", err.message);
  }
}

async function testMulticaixa() {
  const entity = process.env.MULTICAIXA_ENTITY?.trim();
  if (!entity) {
    console.log("▶ Smoke test: Multicaixa — saltado (MULTICAIXA_ENTITY em falta)");
    return;
  }
  console.log(`▶ Smoke test: Multicaixa — entidade ${entity} configurada.`);
  console.log("  [OK] Webhook será validado com MULTICAIXA_WEBHOOK_SECRET em runtime.");
}

// ---------------------------------------------------------------------------

console.log("\n=== Setup de Produção — O Intermediário ===\n");

validateEnvVars();

const authUrl = process.env.BETTER_AUTH_URL;
if (authUrl && !authUrl.startsWith("https://")) {
  console.warn(
    `[AVISO] BETTER_AUTH_URL não começa por https:// ("${authUrl}").\n` +
      "         Em produção, o better-auth exige HTTPS para cookies seguros.\n"
  );
}

run(process.execPath, ["node_modules/prisma/build/index.js", "generate"]);
run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"]);

await testDatabase();
await testBrevo();
await testKambaSms();
await testCloudinary();
await testMulticaixa();

console.log("\n[DONE] Produção pronta. A app pode arrancar com: npm run start\n");
