# Deploy em Produção — O Intermediário

## Inventário de serviços externos

| Serviço | Finalidade | Wrapper/Ficheiro | Variáveis |
|---------|-----------|-----------------|-----------|
| **Supabase** | Base de dados PostgreSQL + Realtime (chat) | `lib/prisma.ts`, `lib/supabase-*.ts`, `lib/realtime.ts` | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **better-auth** | Autenticação, sessões, 2FA | `lib/auth.ts`, `lib/auth-client.ts` | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| **KambaSMS** | SMS/OTP em Angola | `lib/sms/kambasms.ts` | `KAMBA_API_KEY` |
| **Brevo** | E-mails transacionais | `services/brevo.ts` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| **Multicaixa Express / ProxyPay** | Pagamentos | `services/proxypay.ts`, `app/api/pagamentos/multicaixa*/` | `MULTICAIXA_ENTITY`, `MULTICAIXA_WEBHOOK_SECRET` |
| **Cloudinary** | Armazenamento de imagens (nuvem) | `lib/storage.ts` | `STORAGE_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` |
| **Supabase Realtime** | Chat em tempo real (serverless) | `lib/supabase-*.ts`, `lib/realtime.ts`, `app/mensagens/` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **AngoWeb** | Hospedagem (cPanel + Node.js) | — | Variáveis do painel cPanel |

---

## Quando tiveres as chaves, faz isto por esta ordem

### 1. Domínio

- **Regista o domínio** em AngoWeb (se ainda não tens, o domínio `.AO` é grátis no 1.º ano com plano de hospedagem).
- **DNS** — configura os registos conforme o host:

| Tipo | Nome | Valor (VPS/próprio) | Valor (AngoWeb cPanel) |
|------|------|---------------------|------------------------|
| A | `@` | `<IP_DO_SERVIDOR>` | Gerenciado pelo cPanel |
| CNAME | `www` | `<IP_DO_SERVIDOR>` | `cname.vercel-dns.com` ou equivalente |
| MX | `@` | Prioridade 10, mail.dominio.ao | Para e-mail profissional AngoWeb |

- **SSL** — AngoWeb inclui SSL grátis via Let's Encrypt (ativa no cPanel → SSL/TLS).

### 2. AngoWeb (Hospedagem)

AngoWeb suporta Node.js via **cPanel → Application Manager** (Passenger). Requisitos:

- **Node.js 18+** (verifica no painel a versão disponível).
- **Comando de build:** `npm run build` (ou `next build`).
- **Comando de start:** `npm run start` (que corresponde a `next start`).
- **Porta:** a aplicação deve escutar na porta indicada pelo cPanel (normalmente a variável `PORT` é atribuída automaticamente).
- **Variáveis de ambiente:** definidas no cPanel → Application Manager → Environment Variables.
- **Dependências:** `npm install` (o `postinstall` já corre `prisma generate`).
- **`npm run setup:production`** — corre uma vez após colar as variáveis para validar, gerar o client Prisma, aplicar migrations e testar ligações.

**Checklist AngoWeb:**
- [ ] Plano com Node.js ativo (Profissional ou superior para RAM suficiente).
- [ ] Domínio apontado (A/CNAME no cPanel ou AngoWeb DNS).
- [ ] SSL ativo (Let's Encrypt via cPanel).
- [ ] Node.js 18+ selecionado no Application Manager.
- [ ] Variáveis de ambiente coladas no painel.
- [ ] `npm run setup:production` executado sem erros.
- [ ] App a responder em `https://dominio.com`.

### 3. Supabase (Base de Dados)

- Dashboard → **Project Settings** → **Database** → aba **"Direct connection"**.
- Copia a connection string, substitui `[YOUR-PASSWORD]` pela password do utilizador `postgres`.
- Garante `sslmode=require` no final.
- Cola como `DATABASE_URL`.

**Checklist Supabase:**
- [ ] `DATABASE_URL` definida (Direct, não pooler).
- [ ] `npm run setup:production` aplica `prisma migrate deploy` com sucesso.
- [ ] Tabela `_prisma_migrations` criada no Supabase.

### 4. KambaSMS (SMS/OTP)

- Acede a **https://kambasms.ao/dashboard/keys**.
- Cria uma chave API — o prefixo será `kamba_...`.
- Define um **Sender ID** (ex.: `INTERMEDIARIO` ou `OI`) — este é o nome que aparece no SMS.
- Cola a chave como `KAMBA_API_KEY`.

**Formatação de números:** o wrapper `lib/sms/kambasms.ts` normaliza automaticamente para `+244XXXXXXXXX`. Os utilizadores podem inserir `923456789` ou `+244923456789`.

**Checklist KambaSMS:**
- [ ] Conta KambaSMS criada e com saldo.
- [ ] `KAMBA_API_KEY` definida.
- [ ] Sender ID aprovado (pode levar até 24h).
- [ ] Smoke test: `npm run setup:production` mostra `[OK] KambaSMS acessível`.

### 5. Brevo (Email)

- Acede a **Brevo** (antigo Sendinblue) → **Settings** → **SMTP & API** → **API Keys**.
- Cria uma chave API.
- Vai a **Contacts** → **Senders** e verifica o remetente (ex.: `noreply@ointermediario.ao`).
- Cola a chave como `BREVO_API_KEY` e o e-mail como `BREVO_SENDER_EMAIL`.

**Checklist Brevo:**
- [ ] Conta Brevo criada.
- [ ] `BREVO_API_KEY` definida.
- [ ] Remetente verificado em Contacts → Senders.
- [ ] Smoke test: `npm run setup:production` mostra `[OK] Brevo verificado`.

### 6. Multicaixa Express / ProxyPay (Pagamentos)

- Obtém as credenciais junto do banco parceiro ou painel ProxyPay/EMIS.
- Coloca `MULTICAIXA_ENTITY` (número da entidade no Multicaixa).
- Configura `MULTICAIXA_WEBHOOK_SECRET` — o segredo para validar assinaturas HMAC-SHA256 dos webhooks.
- **O webhook URL é:** `https://dominio.com/api/pagamentos/multicaixa-webhook`
- Regista este URL no painel ProxyPay/EMIS **após o domínio estar ativo e com SSL**.

**Checklist Multicaixa:**
- [ ] `MULTICAIXA_ENTITY` definida.
- [ ] `MULTICAIXA_WEBHOOK_SECRET` definida.
- [ ] Domínio com SSL ativo.
- [ ] Webhook URL registado no painel ProxyPay/EMIS.

### 7. Cloudinary (Imagens) — opcional

- Se quiseres armazenar imagens na nuvem em vez de local (`public/uploads/`):
  - Cria conta em **https://console.cloudinary.com**.
  - Copia o **Cloud Name** do Dashboard.
  - Vai a **Settings** → **Upload** → **Upload presets** → cria um preset **Unsigned**.
  - Define `STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_CLOUD_NAME` e `CLOUDINARY_UPLOAD_PRESET`.

**Checklist Cloudinary:**
- [ ] `STORAGE_PROVIDER=cloudinary`.
- [ ] `CLOUDINARY_CLOUD_NAME` e `CLOUDINARY_UPLOAD_PRESET` definidos.
- [ ] Smoke test: `npm run setup:production` mostra `[OK] Cloudinary upload test OK`.

### 8. Arranque final

```bash
npm run setup:production   # Valida, gera client, aplica migrations, smoke tests
npm run start              # Arranca a app em produção
```

---

## Comportamento em dev (sem chaves de produção)

A app continua a arrancar em `localhost:3000`:

| Serviço | Comportamento sem chave |
|---------|------------------------|
| Supabase | Usa o Postgres local (`.env` com `DATABASE_URL` local) |
| KambaSMS | `console.warn` + OTP logado no console |
| Brevo | `console.warn` + e-mails ignorados (verification link logado) |
| Cloudinary | Fallback automático para `public/uploads/` |
| Multicaixa | Referências geradas aleatoriamente (stub) |
| better-auth | Secret padrão aceite em dev; **lança erro em produção** |
