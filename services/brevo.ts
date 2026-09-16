// ---------------------------------------------------------------------------
// Email genérico via Brevo — utilitário para envio de e-mails transacionais.
// Reutiliza a API REST v3 do Brevo; graceful skip se BREVO_API_KEY em falta.
// ---------------------------------------------------------------------------

interface SendEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
}: SendEmailParams): Promise<{ success: boolean; skipped?: boolean; messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[Brevo] BREVO_API_KEY não configurada. E-mail ignorado.");
    return { success: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "O Intermediário",
          email: process.env.BREVO_SENDER_EMAIL || "nao-responder@ointermediario.ao",
        },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[Brevo] API ${res.status}:`, err);
      return { success: false };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error("[Brevo] Erro ao enviar e-mail:", err instanceof Error ? err.message : err);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Template de verificação de e-mail
// ---------------------------------------------------------------------------

export function buildVerificationEmailHtml(userName: string, verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
        <h2 style="color: #ea580c; text-align: center;">O Intermediário</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Clique no botão abaixo para verificar o seu e-mail e ativar a sua conta:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #ea580c; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verificar E-mail
          </a>
        </div>
        <p style="font-size: 12px; color: #71717a;">Se não criou uma conta, ignore este e-mail.</p>
        <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 16px 0;">
        <p style="font-size: 11px; color: #a1a1aa; text-align: center;">
          © ${new Date().getFullYear()} O Intermediário. Todos os direitos reservados.
        </p>
      </div>
    </body>
    </html>`;
}

// ---------------------------------------------------------------------------
// Template de OTP / verificação por SMS (texto curto — para KambaSMS)
// ---------------------------------------------------------------------------

export function buildOtpSmsText(otp: string): string {
  return `O seu codigo de verificacao e ${otp}. Nao partilhe com ninguem.`;
}

// ---------------------------------------------------------------------------
// E-mail de referência Multicaixa Express (pagamentos)
// ---------------------------------------------------------------------------

interface SendMCXEmailParams {
  toEmail: string;
  toName: string;
  entity: string;
  reference: string;
  amountInKz: number;
  itemName: string;
  expiresAt: Date;
}

export async function sendMulticaixaReferenceEmail({
  toEmail,
  toName,
  entity,
  reference,
  amountInKz,
  itemName,
  expiresAt,
}: SendMCXEmailParams) {
  const formattedAmount = new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(amountInKz);

  const formattedRef = reference.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

  const formattedExpiry = new Intl.DateTimeFormat("pt-AO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiresAt);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; background: #ffffff; margin: 0 auto; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7; }
        .header { text-align: center; border-bottom: 1px solid #f4f4f5; padding-bottom: 16px; }
        .title { font-size: 18px; color: #18181b; font-weight: bold; margin-top: 8px; }
        .box { background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .ref-box { background-color: #fff7ed; border: 1px solid #ffedd5; padding: 12px; border-radius: 8px; text-align: center; margin: 12px 0; }
        .ref-value { font-size: 22px; color: #c2410c; font-weight: bold; font-family: monospace; letter-spacing: 2px; }
        .footer { font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #ea580c; margin: 0;">O Intermediário</h2>
          <div class="title">Instruções de Pagamento Multicaixa</div>
        </div>
        <p style="font-size: 14px; color: #3f3f46;">Olá <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #3f3f46;">Obrigado por utilizar a nossa plataforma. Utilize os dados abaixo para concluir o pagamento de <strong>${itemName}</strong>:</p>
        <div class="box">
          <table width="100%" style="font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #71717a;">Entidade:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; font-family: monospace; color: #18181b;">${entity}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a;">Valor Total:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #18181b;">${formattedAmount}</td>
            </tr>
          </table>
          <div class="ref-box">
            <div style="font-size: 11px; color: #c2410c; font-weight: bold; text-transform: uppercase;">Referência Multicaixa</div>
            <div class="ref-value">${formattedRef}</div>
          </div>
          <p style="font-size: 12px; color: #71717a; margin: 0; text-align: center;">
            Válido até: <strong>${formattedExpiry}</strong>
          </p>
        </div>
        <p style="font-size: 13px; color: #52525b; font-weight: bold; margin-bottom: 4px;">Como Pagar no Multicaixa Express:</p>
        <ol style="font-size: 12px; color: #71717a; padding-left: 20px; margin-top: 0;">
          <li>Abra a App <strong>Multicaixa Express</strong> no telemóvel</li>
          <li>Aceda a <strong>Pagamentos</strong> &gt; <strong>Pagamento por Referência</strong></li>
          <li>Insira a Entidade, Referência e Valor listados acima</li>
          <li>Confirme com o seu PIN</li>
        </ol>
        <div class="footer">
          <p>Assim que o pagamento for concluído, o seu plano/destaque será ativado automaticamente.</p>
          <p>© ${new Date().getFullYear()} O Intermediário. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ toEmail, toName, subject: `Dados de Pagamento MCX - ${itemName}`, htmlContent });
}
