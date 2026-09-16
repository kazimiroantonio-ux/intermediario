import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber, twoFactor } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, sanitizeText } from "@/lib/security";
import { sendOtpSms, sendSms } from "@/lib/sms/kambasms";
import {
  normalizeLoginPhone,
  phoneToTempEmail,
  phoneToTempName,
  storeDevOtpCode,
} from "@/lib/phoneAuth";
import { sendEmail, buildVerificationEmailHtml } from "@/services/brevo";

// ---------------------------------------------------------------------------
// Schemas Zod — validação rígida de entradas de autenticação
// ---------------------------------------------------------------------------

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email demasiado longo.")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Email inválido.");

const passwordField = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 carateres.")
  .max(128, "A palavra-passe deve ter no máximo 128 carateres.")
  .refine((v) => /[A-Z]/.test(v), "Inclua pelo menos uma letra maiúscula.")
  .refine((v) => /[a-z]/.test(v), "Inclua pelo menos uma letra minúscula.")
  .refine((v) => /[0-9]/.test(v), "Inclua pelo menos um número.")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "Inclua pelo menos um carater especial.");

const nameField = z
  .string()
  .trim()
  .min(2, "Nome demasiado curto.")
  .max(80, "Nome demasiado longo.")
  .transform((v) => sanitizeText(v, 80));

const phoneField = z
  .string()
  .trim()
  .max(20)
  .refine(
    (v) => v === "" || /^(?:\+244)?\s?9\d{2}[\s-]?\d{3}[\s-]?\d{3}$/.test(v),
    "Número de telefone angolano inválido (ex.: +244 923 456 789)."
  );

// ---------------------------------------------------------------------------
// Anti brute-force em memória: 5 tentativas por IP a cada 15 minutos
// nas rotas críticas de autenticação (login, registo, recuperação).
// ---------------------------------------------------------------------------

const AUTH_RATE_PATHS = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/forget-password",
  "/request-password-reset",
]);

function enforceAuthRateLimit(ctx: { path: string; request?: Request }) {
  if (!AUTH_RATE_PATHS.has(ctx.path)) return;
  const ip =
    ctx.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ctx.request?.headers.get("x-real-ip") ??
    "desconhecido";
  const rl = rateLimit(`auth:${ctx.path}:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: `Demasiadas tentativas. Tente novamente dentro de ${Math.ceil(rl.retryAfterSec / 60)} minuto(s).`,
    });
  }
}

// ---------------------------------------------------------------------------
// Trusted origins — domínios extras aceites para CORS/CSRF (opcional)
// ---------------------------------------------------------------------------

const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

// ---------------------------------------------------------------------------
// Configuração better-auth
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requirePasswordConfirmation: true,
  },
  plugins: [
    // Login/registo por telemóvel (spec "Conta por telefone", Fase 2).
    // OTS: o plugin gera o código, guarda o hash na tabela `Verification`,
    // limita tentativas e cria a sessão após verificação. O SMS segue pelo
    // KambaSMS; sem chave configurada não rebenta (código vai para o console).
    phoneNumber({
      allowedAttempts: 3,
      expiresIn: 300,
      phoneNumberValidator: (p) => /^\+2449\d{8}$/.test(p),
      sendOTP: async ({ phoneNumber: number, code }) => {
        storeDevOtpCode(number, code);
        const result = await sendSms(
          number,
          `O Intermediário: código de acesso ${code}. Válido por 5 minutos. Não partilhe este código.`
        );
        if (result.ok) return;
        if (result.skipped) {
          console.log(`[TELEFONE] KambaSMS desligada. Código para ${number}: ${code}`);
          return;
        }
        console.error(`[TELEFONE] SMS falhou para ${number}: ${result.error}`);
      },
      signUpOnVerification: {
        getTempEmail: phoneToTempEmail,
        getTempName: phoneToTempName,
      },
      callbackOnVerification: async ({ phoneNumber: number, user }) => {
        // Mantém o campo legado `phone` sincronizado (2FA SMS e agentes usam-no).
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: number, phoneNumberVerifiedAt: new Date() },
        });
      },
    }),
    // 2FA (spec v3 §5): TOTP via aplicação autenticadora + OTP por email.
    // Em produção, o envio de OTP liga ao fornecedor (Brevo/SMS) — nunca log.
    twoFactor({
      issuer: "O Intermediário",
      otpOptions: {
        otpLength: 6,
        otpExpiresIn: 600,
        async sendOTP({ user, otp }) {
          const phone = (user as { phone?: string }).phone;
          if (phone) {
            const result = await sendOtpSms(phone);
            if (result.ok) return;
            if (result.skipped) {
              console.log(`[OTP2FA] KambaSMS desligada. Código para ${user.email}: ${otp}`);
              return;
            }
            console.error(`[OTP2FA] SMS falhou para ${user.email}: ${result.error}`);
          } else {
            console.log(`[OTP2FA] Sem telefone para ${user.email}; usando fallback console.`);
          }
          console.log(`[OTP2FA] ${user.email} -> ${otp}`);
        },
      },
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      enforceAuthRateLimit(ctx);

      // Registo: valida nome, email e força da password; sanitiza texto livre.
      if (ctx.path === "/sign-up/email") {
        const parsedName = nameField.safeParse(ctx.body?.name);
        if (!parsedName.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsedName.error.issues[0]?.message ?? "Nome inválido.",
          });
        }
        const parsedEmail = emailField.safeParse(ctx.body?.email);
        if (!parsedEmail.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsedEmail.error.issues[0]?.message ?? "Email inválido.",
          });
        }
        const parsedPassword = passwordField.safeParse(ctx.body?.password);
        if (!parsedPassword.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsedPassword.error.issues[0]?.message ?? "Palavra-passe fraca.",
          });
        }

        ctx.body = {
          ...ctx.body,
          name: parsedName.data,
          email: parsedEmail.data,
          password: ctx.body.password,
          phone:
            typeof ctx.body?.phone === "string" && phoneField.safeParse(ctx.body.phone).success
              ? String(ctx.body.phone).trim()
              : undefined,
          whatsapp:
            typeof ctx.body?.whatsapp === "string" && phoneField.safeParse(ctx.body.whatsapp).success
              ? String(ctx.body.whatsapp).trim()
              : undefined,
          companyName: ctx.body?.companyName
            ? sanitizeText(String(ctx.body.companyName), 120)
            : undefined,
          bio: ctx.body?.bio ? sanitizeText(String(ctx.body.bio), 500) : undefined,
        };
      }

      // Login: formato estrito de email antes de tocar na base de dados.
      if (ctx.path === "/sign-in/email") {
        const parsed = emailField.safeParse(ctx.body?.email);
        if (!parsed.success) {
          throw new APIError("BAD_REQUEST", { message: "Credenciais inválidas." });
        }
        ctx.body = { ...ctx.body, email: parsed.data };
      }

      // Telemóvel (login por SMS): normaliza o número e liga contas existentes
      // registadas com `phone` ao identificador do plugin `phoneNumber`.
      if (ctx.path === "/phone-number/send-otp") {
        const parsed = normalizeLoginPhone(String(ctx.body?.phoneNumber ?? ""));
        if (!parsed.ok) {
          throw new APIError("BAD_REQUEST", { message: parsed.reason });
        }
        ctx.body = { ...ctx.body, phoneNumber: parsed.phone };
        await prisma.user.updateMany({
          where: { phone: parsed.phone, phoneNumber: null },
          data: { phoneNumber: parsed.phone },
        });
      }

      // Verificação do código: formato fixo 6 dígitos antes de consultar.
      if (ctx.path === "/phone-number/verify") {
        const parsed = normalizeLoginPhone(String(ctx.body?.phoneNumber ?? ""));
        if (!parsed.ok) {
          throw new APIError("BAD_REQUEST", { message: parsed.reason });
        }
        const code = sanitizeText(String(ctx.body?.code ?? ""), 8).replace(/\D/g, "");
        if (code.length !== 6) {
          throw new APIError("BAD_REQUEST", { message: "O código tem de ter 6 dígitos." });
        }
        ctx.body = { ...ctx.body, phoneNumber: parsed.phone, code };
      }

      // Alteração de password: mesma política de força.
      if (ctx.path === "/change-password") {
        const parsedPassword = passwordField.safeParse(ctx.body?.newPassword);
        if (!parsedPassword.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsedPassword.error.issues[0]?.message ?? "Palavra-passe fraca.",
          });
        }
      }

      // Atualização de perfil: sanitiza campos de texto livre (anti-XSS)
      // e bloqueia escalonamento de privilégios via mass assignment.
      if (ctx.path === "/update-user") {
        const patch: Record<string, unknown> = { ...ctx.body };
        const parsedName = typeof patch.name === "string" ? nameField.safeParse(patch.name) : null;
        if (parsedName && !parsedName.success) {
          throw new APIError("BAD_REQUEST", {
            message: parsedName.error.issues[0]?.message ?? "Nome inválido.",
          });
        }
        if (typeof patch.phone === "string" && !phoneField.safeParse(patch.phone).success) {
          throw new APIError("BAD_REQUEST", { message: "Telefone inválido." });
        }
        if (parsedName?.success) patch.name = parsedName.data;
        if (typeof patch.bio === "string") patch.bio = sanitizeText(patch.bio, 500);
        if (typeof patch.companyName === "string")
          patch.companyName = sanitizeText(patch.companyName, 120);
        if (typeof patch.province === "string") patch.province = sanitizeText(patch.province, 60);
        if (typeof patch.whatsapp === "string" && phoneField.safeParse(patch.whatsapp).success) {
          patch.whatsapp = String(patch.whatsapp).trim();
        }
        // Bloquear campos sensíveis
        delete patch.role;
        delete patch.isVerified;
        // Telemóvel: só permite libertar (null); a alteração exige OTP (plugin).
        if (patch.phoneNumber !== null) delete patch.phoneNumber;
        delete patch.phoneNumberVerified;
        delete patch.phoneNumberVerifiedAt;
        ctx.body = patch;
      }
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const full = `${url}&callbackURL=${encodeURIComponent("/entrar?verificado=1")}`;
      const result = await sendEmail({
        toEmail: user.email,
        toName: user.name || "Utilizador",
        subject: "Verifique o seu e-mail - O Intermediário",
        htmlContent: buildVerificationEmailHtml(user.name || "Utilizador", full),
      });
      if (result.skipped) {
        console.log(`[VERIFICAÇÃO] Brevo desligada. URL para ${user.email}: ${full}`);
      } else if (!result.success) {
        console.error(`[VERIFICAÇÃO] Falha ao enviar e-mail para ${user.email}. URL: ${full}`);
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "USER",
      },
      province: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
      whatsapp: {
        type: "string",
        required: false,
        input: true,
      },
      companyName: {
        type: "string",
        required: false,
        input: true,
      },
      isVerified: {
        type: "boolean",
        required: false,
        input: false,
        defaultValue: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 900,
    max: 50,
  },
});
