# PLANO V3 — O INTERMEDIÁRIO (empresa digital completa)

> Reconciliado a 10/09/2026. Referências de segurança: **OWASP ASVS 5.0** (requisitos
> técnicos), **OWASP Top 10:2025** (riscos web) e **OWASP API Security Top 10** (APIs).
> Este ficheiro é o espelho operacional da spec; o código é a fonte de verdade.

## Estado global

- **Núcleo implementado e testado (566 testes a passar):** comissão 30/70 (`lib/commission.ts`),
  anti-desintermediação (`lib/contactFilter.ts`), providers de pagamento com idempotência
  (`services/paymentProvider.ts`), motor documental determinístico (templates aprovados, nunca
  inventa cláusulas) (`lib/documentEngine.ts`), workflow documental com OTP/hash (
  `lib/documentWorkflow.ts`), adaptador Prisma (`services/documentRepo.ts`), máquina de estados
  do negócio (spec v3) (`lib/dealStateMachine.ts`), máquina do anúncio (`lib/listingStateMachine.ts`),
  autorização por função (`lib/accessPolicy.ts`), upload seguro (`lib/secureUpload.ts`),
  auditoria append-only (`lib/audit.ts`), reembolsos com dupla aprovação (`lib/refundWorkflow.ts`),
  verificação de vendedor/imóvel com selo e gate de publicação (`lib/verificationWorkflow.ts`),
  filas da consola interna com SLA/responsável/escalamento (`lib/workQueue.ts`),
  pagamentos/reconciliação em 10 estados (`lib/paymentWorkflow.ts`),
  notificações multicanal com dedupe/backoff (`lib/notifications.ts`),
  suporte e disputas com gate de negócio (`lib/supportWorkflow.ts`),
  IA com guarda-redes humana (`lib/aiAssist.ts`),
  relatórios da direção (`lib/reports.ts`),
  automações por relógio idempotentes (`lib/automations.ts`),
  OTP determinístico com hash/TTL/rate-limit (`lib/otp.ts`),
  atividades da conta única e seletor comprador/vendedor (`lib/activities.ts`),
  gestão de sessões/dispositivos com garantia de que a sessão atual nunca é revogada (`lib/sessions.ts`).
- **Sem BD ativa:** Supabase bloqueia migrations (falta Direct connection string — porta 5432).
  Por isso o que é puro está validado; o que é de BD (`db push` → seeds → rotas) está à espera.
- **Schema (`prisma/schema.prisma`)** válido e client gerado, incluindo os modelos v3 aditivos:
  `ListingEvent`, `OperatorRole`, `Permission`, `OperatorRolePermission`, `AiAction`,
  `IntegrationEvent`, `AuditEvent` (cadeia de hashes), `RefundStatus` v3 (`EM_APROVACAO`,
  `EM_PROCESSAMENTO`, `CANCELADO`), `User.operatorRoleId`, estados v3 (`RELATORIO_SOLICITADO`,
  `BLOQUEADO_POR_*`, `SUSPENSO`, `FRAUDE_EM_INVESTIGACAO`, `REEMBOLSO_*` e `ListingStatus`
  RASCUNHO→VERIFICADO).

## As 8 áreas (spec v3 sec. 1)

| Área | Existe em | Pendente |
|---|---|---|
| 1. Site público | anúncios/pesquisa (app) | • filtros por estado documental/vendedor verificado • custos previsíveis no card |
| 2. Comprador | áreas base (app) | • painel de estado do negócio/“o que falta/quem age/quanto paguei” |
| 3. Vendedor | publicar/verificar | • fluxo crítico de IBAN (novo IBAN + titular + revisão + espera + autorização) |
| 4. Agentes | gestão básica | • negócios/comissões num painel próprio |
| 5. Consola operacional | `lib/workQueue.ts` (filas VERIFICATION/FINANCIAL/COMPLIANCE/SUPPORT, responsável, SLA, escalamento, `workloadSummary`, adaptadores) | • interfaçe de rotas/UI da consola |
| 6. Módulo financeiro | `CommissionCharge` 30/70, `PaymentProvider`, `IntegrationEvent`, reembolsos (`lib/refundWorkflow.ts`, dupla aprovação via four-eyes), ciclo v3 de pagamentos/reconciliação (`lib/paymentWorkflow.ts`) | • faturação angolana, `PaymentStatus` v3 ligado às rotas/schema |
| 7. Jurídico/documental | `DealDocument`/assinaturas/versões/hash | • validade/expiração automática (job) • arquivo |
| 8. Administração/segurança | `OperatorRole`+`Permission`, auditoria append-only (`lib/audit.ts` + schema `AuditEvent`), `AiAction` | • MFA obrigatório staff • WAF • relatórios da direção |

## Máquinas de estado

**Negócio** (`lib/dealStateMachine.ts`) — `LEAD → … → VISIT_DONE → RELATORIO_SOLICITADO →
DUE_DILIGENCE → REPORT_DELIVERED → NEGOTIATING → AGREED → DEPOSIT_PENDING → DEPOSIT_PAID →
ACT_SCHEDULED → ACT_IN_PROGRESS → SETTLED → CLOSED_WON` + exceções. Regra de ouro: **nenhuma
transição de dinheiro sem confirmação de quem recebe** (`ACT_IN_PROGRESS→SETTLED` exige
`sellerReceiptConfirmedAt`; `SETTLED→CLOSED_WON` exige `handoverConfirmed`; `REEMBOLSO_PENDENTE→
REEMBOLSO_CONCLUIDO` exige `refundSettled`). Estados v3 com saídas **explicitas** (não herdam Exits
genéricos): `BLOQUEADO_POR_DOCUMENTOS→DUE_DILIGENCE`, `BLOCKED_POR_RISCO→FRAUDE_EM_INVESTIGACAO`,
`SUSPENSO` controlado, terminais `FRAUDE_EM_INVESTIGACAO`/`REEMBOLSO_CONCLUIDO`.

**Anúncio** (`lib/listingStateMachine.ts`) — `DRAFT → PENDING_VERIFICATION → VERIFIED → ACTIVE` +
`EXPIRED/BLOCKED/REJECTED/CLOSED`. Gates: não publicar sem `docsVerified+sellerVerified+publishApproved`;
edição de preço/IBAN bloqueada pós-publicação sem exceção de compliance.

## Regras de transição (spec v3 sec. 3)

- Não publicar sem verificação do vendedor ✔ (listing gates)
- Não solicitar os 30% sem relatório entregue ✔ (fluxo `REPORT_DELIVERED`)
- Não agendar o ato com documentos expirados — **pendente** (job de expiração + gate)
- Não cobrar os 70% sem ato preparado ✔ (`ACT_SCHEDULED→ACT_IN_PROGRESS`)
- Não desbloquear escritura sem pagamento confirmado ✔ (webhook/reconciliação, `bankTxnRef @unique`)
- Não aceitar pagamento de terceiro sem autorização ✔ (`COMMISSION_PAYMENT_AUTHORIZATION` assinado + AML)
- Não aceitar comprovativo como prova de entrada ✔ (só webhook/reconciliação)
- Não alterar IBAN durante o ato ✔ (`sellerIbanLocked` + `PendingRiskAction IBAN_CHANGE`)
- Não reembolsar sem causa/aprovação ✔ (four-eyes `refunds.approve` FINANCEIRO+SUPERVISOR)
- O sistema **recusa e explica porquê** ✔ (WorkflowError com códigos; `canTransition()` devolve
  `missingGuards`/reason — nunca erro genérico)

## Perfis e permissões (spec v3 sec. 4)

`OperatorRole` (`AGENT|VERIFICADOR|FINANCEIRO|COMPLIANCE|SUPERVISOR|ADMIN_TECNICO|ADMIN_PRINCIPAL`)
+ `Permission` (`recurso.ação`) + `OperatorRolePermission` (muitos-para-muitos). Matriz testada em
`lib/accessPolicy.ts`:
- **Four-eyes** aplicado por construção: `FOUR_EYES_HIGH_RISK` = `refunds.approve`, `deals.override`,
  `aml.approve`, `listings.block` (requerente ≠ aprovador e funções diferentes).
- **Escopo de objeto** (BOLA): as rotas devolvem `403` se o agente não estiver associado ao `Deal`
  (já nas rotas de documentos); repetir nas restantes.
- Admin técnico **não vê documentos** sem justificação; ninguém apaga auditoria.

## Segurança técnica (spec v3 sec. 5)

Já: hash forte de passwords (better-auth), OTP para assinaturas, rate limiting, CSRF origin,
idempotência de pagamentos, upload com magic bytes (PDF/JPG/PNG), hash e renomeação segura,
links de consentimento com expiração, auditoria IP/dispositivo, segregação pelos modelos de eventos.
Pendente (fases 6+: operação): MFA obrigatório para staff, WAF, monitorização/alertas, pen-tests,
gestão de vulnerabilidades, DR testado, revisão de fornecedores, logs à prova de adulteração em
sistema separado (SIEM), cifragem de backups/repouso validada no provider.

## Segurança da IA (spec v3 sec. 6)

Modelo **IA controlada**: o motor atual é determinístico (`documentEngine`, templates aprovados,
placeholder autorizados). Quando a Fase 5 (IA) entrar, cada `AiAction` registará modelo/versão/
`inputHash`/fontes/confiança/aprovador/`appliedChanges` (tabela `ai_actions`, append-only). A IA
não aprova vendedor, não conclui AML, não altera contratos assinados, não liberta escritura, não
autoriza reembolsos, não decide fraude, não treina modelos com dados de clientes. Mitigações a
codificar na Fase 5: prompt injection em PDFs, extração de templates, gating de ferramentas.

## Pagamentos (spec v3 sec. 8)

- Comissão 30/70 em cêntimos (`Agreement`+`CommissionCharge` DEPOSIT/BALANCE). Comprador paga a
  comissão ao site; os 90% pagos ao vendedor **nunca entram no ledger**.
- Estados de pagamento além de `PENDING/RECEIVED`: `IntegrationEvent` + `Payment.bankTxnRef @unique`
  + `IdempotencyGuard` garantem que webhook duplicado não duplica crédito; fornecedor em baixo →
  `PENDENTE`, nunca CONCLUÍDO por engano.
- Reembolsos: `lib/refundWorkflow.ts` (pedido+causa+suporte, four-eyes FINANCEIRO+SUPERVISOR,
  reembolsos altos exigem 2 aprovações, método, prazo/escalamento, liquidação só com referência
  de reconciliação) + `RefundStatus` v3 no schema + `RefundRequest`. Pendente: ligar às rotas e
  à faturação angolana (recibos/IVA) — confirmar com contabilista.
- Auditoria: `lib/audit.ts` (append-only, cadeia sha256, idempotência por `occurrenceId`,
  verificação de cadeia) + modelo `AuditEvent` no schema. Pendente: escrita nas rotas críticas
  e exportação imutável.

## Notificações (spec v3 sec. 10)

Pendente: serviço de notificações com população por evento (doc rejeitado, relatório pronto,
pagamento recebido, comissão pendente, IBAN alterado, assinatura, bloqueio, reembolso, prazo).
Canais: email (docs/recibos), SMS/WhatsApp (urgentes), in-app, OTP. **Nunca** documento completo em
SMS/email — link autenticado temporário.

## Ordem de prioridade (spec v3 sec. 18) — estado

1. Autenticação e permissões — **em curso** (modelos+matriz prontos; ligar ao login/rotas)
2. Máquina de estados — ✔ negócio + anúncio
3. Documentos e auditoria — ✔ (adaptador+rotas+`lib/audit.ts`; falta expirar e escrever nas rotas)
4. Verificação vendedor/imóvel — ✔ lib + testes (`lib/verificationWorkflow.ts`, selo + AML + gate);
   ligar à rota/fila quando houver BD
5. Pagamentos e reconciliação — ✔ lib (`lib/paymentWorkflow.ts`: 10 estados da spec, dedupe de
   confirmação, reconciliação `matchStatement`, `PAYMENT_DB_MAP` p/ schema atual); ligar rotas quando houver BD
6. Contratos e assinaturas — ✔ base; visualizador/PDF pendente
7. Consola interna — ✔ lib + testes (`lib/workQueue.ts`: filas com responsável/SLA/escalamento,
   painel `workloadSummary`, adaptadores verification/refund/compliance); interfaçe de rotas pendente
8. Notificações — ✔ lib + testes (`lib/notifications.ts`: multicanal, preferências, dedupe,
   backoff, trinco SEGURANCA); providers (SMS/WhatsApp) e enfileiramento por rotas pendente
9. Suporte e disputas — ✔ lib + testes (`lib/supportWorkflow.ts`: SLA/escalamento, disputa bloqueia
   o negócio); modelos `SupportTicket`/`Dispute` no schema por criar
10. IA — ✔ Fase 5 (`lib/aiAssist.ts`: sugere, nunca executa; blocker de contacto/IBAN/cláusulas
    fora de template; valores só se baterem 30/70; log `AiAction` idempotente + aprovação humana)
11. Relatórios avançados — ✔ lib + testes (`lib/reports.ts`: KPIs, funil, receita por mês em
    cêntimos, filas/SLA, saúde da verificação); painel de UI pendente
12. Automações adicionais — ✔ lib + testes (`lib/automations.ts`: expiração de anúncios,
    escalamentos de verificação/reembolso/pagamento, downgrade de planos; idempotente e reversível)
13. **Fase 1 — Conta única, auth e atividades (✔ parcial):**
    - Schema: `PaymentStatus` v3 (10 estados + legados); modelos `UserActivity`, `OtpCode`,
      `BankAccount`, `KycCase`, `AmlCase`, `AiRequest`, `SupportTicket`, `Dispute`, `Task` —
      `prisma db push` aplicado (BD local).
    - Auth: better-auth com **TOTP + OTP por email** (`twoFactor` plugin, `lib/auth.ts`) e
      `twoFactorClient` no `lib/auth-client.ts`; rate-limit anti brute-force 5/15 min;
      validação de nome/email/força de password; sanitização anti-XSS; bloqueio de
      mass-assignment.
    - OTP: `lib/otp.ts` — emite código 6 dígitos (sha256/armazenamento), TTL 10 min,
      máximo 5 tentativas, consumo único, anti-spam (novo OTP invalida o anterior).
    - **SMS/OTP via KambaSMS:** `lib/sms/kambasms.ts` — wrapper leve (fetch nativo, sem SDK)
      com normalização de números +244, validação de mensagens (160 chars, sem URLs/emojis),
      envio SMS simples e OTP via endpoint dedicado. Fallback gracioso sem `KAMBA_API_KEY`.
    - **Email via Brevo:** `services/brevo.ts` — função genérica `sendEmail()` + templates
      de verificação e referência MCX. 2FA envia OTP por SMS (KambaSMS) quando o utilizador
      tem telefone registado; fallback para console. Verificação de email usa Brevo.
    - Atividades: `lib/activities.ts` + seletor `[Todas | Como comprador | Como vendedor]`
      no `app/conta/page.tsx`; endpoint `GET/POST /api/activities`.
    - **Sessões/dispositivos (tarefa 2 ✔):** `lib/sessions.ts` (parse de User-Agent,
      localização aproximada por IP, lista ordenada por último acesso, plano de
      revogação que exclui sempre a sessão atual); `GET /api/sessoes` +
      `POST /api/sessoes/revoke` (individual por `id` ou `all:true` →
      `revokeOtherSessions`); UI em `/conta/seguranca` com marcação "Esta sessão"
      e botões de terminar; testes incluem nunca revogar a atual.
    - UI: dorso do painel `app/conta` com o `ActivityContextSelector`.
    - Testes: **11 OTP + 19 atividades + 33 sessões + 19 SMS** (585/585 com os 19 anteriores;
      tsc = 0; baseline de migrations gerada (`prisma/migrations/20260915000000_init/`)).
    **Pendente Fase 1/2:** login com OTP
    por telefone (provider SMS/WhatsApp — KambaSMS já integrado, falta UI de
    registo/login por telefone); painel do agente e consola do gestor.

## Regra operacional central (spec v3)

> **Cada ação crítica = utilizador identificado + prova verificável + regra de autorização +
> registo de auditoria + reversão controlada.**

## Testes

Bateria atual (Node 24):

```bash
node --experimental-strip-types test-commission.mjs
node --experimental-strip-types test-contactfilter.mjs
node --experimental-strip-types test-paymentprovider.mjs
node --experimental-strip-types test-documentengine.mjs
node --experimental-strip-types test-documentworkflow.mjs
node --experimental-strip-types test-dealstatemachine.mjs
node --experimental-strip-types test-listingstatemachine.mjs
node --experimental-strip-types test-accesspolicy.mjs
node --experimental-strip-types test-secureupload.mjs
node --experimental-strip-types test-refundworkflow.mjs
node --experimental-strip-types test-audit.mjs
node --experimental-strip-types test-verificationworkflow.mjs
node --experimental-strip-types test-workqueue.mjs
node --experimental-strip-types test-paymentworkflow.mjs
node --experimental-strip-types test-notifications.mjs
node --experimental-strip-types test-supportworkflow.mjs
node --experimental-strip-types test-aiassist.mjs
node --experimental-strip-types test-reports.mjs
node --experimental-strip-types test-automations.mjs
node --experimental-strip-types test-otp.mjs
node --experimental-strip-types test-activities.mjs
node --experimental-strip-types test-sessions.mjs
node --experimental-strip-types test-sms.mjs
```

Validation: `prisma validate` + `prisma generate` + `tsc --noEmit`. Em máquinas
com pouca RAM (o total inclui `.next/types` e precisa de >1 GB), `tsc -p tsconfig.check.json`
valida lib+services+app com um programa reduzido.

## Produção — checklist de deploy (plug-and-play)

Todos os serviços externos estão inventariados e os wrappers criados. Passos ao
receberes as chaves:

1. Cola as variáveis no host ou cria o `.env` a partir do `.env.example`
   (organizado por serviço — v. [DEPLOY.md](DEPLOY.md)).
2. Corre `npm run setup:production` (valida env obrigatórias por serviço,
   `prisma generate`, `prisma migrate deploy`, smoke tests de BD/Brevo/KambaSMS/
   Cloudinary/Multicaixa — cada um só corre se a chave estiver presente).
3. Aponta o domínio no DNS (AngoWeb/cPanel), ativa SSL e atualiza
   `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` no host.
4. Configura o webhook Multicaixa no painel ProxyPay/EMIS:
   `https://dominio/api/pagamentos/multicaixa-webhook`.
5. Arranca com `npm run start`.
6. Verifica end-points-chave: `/api/auth/*`, `/api/sessoes`, `/api/activities`,
   `/conta/seguranca`, `/api/pagamentos/multicaixa`.

**Serviços externos integrados (com wrapper próprio):**

| Serviço | Wrapper | Env vars |
|---------|---------|----------|
| Supabase (BD) | `lib/prisma.ts` | `DATABASE_URL` |
| KambaSMS (SMS/OTP) | `lib/sms/kambasms.ts` | `KAMBA_API_KEY` |
| Brevo (email) | `services/brevo.ts` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| Multicaixa/ProxyPay (pagamentos) | `services/proxypay.ts`, `app/api/pagamentos/multicaixa*/` | `MULTICAIXA_ENTITY`, `MULTICAIXA_WEBHOOK_SECRET` |
| Cloudinary (imagens) | `lib/storage.ts` | `STORAGE_PROVIDER`, `CLOUDINARY_*` |
| better-auth | `lib/auth.ts`, `lib/auth-client.ts` | `BETTER_AUTH_*` |

> Documentação completa, inventário e notas sobre comportamento sem chaves em
> [DEPLOY.md](DEPLOY.md).

## Bloqueado / próximo passo

- **BD:** obter Direct connection string Supabase → `prisma db push` → `seed-geografia.js` →
  `seed-core.js` → `seed-accounts.js`; ligar rotas do acerto/depósito aos gates
  (`gateToAgreed`/`gateToDeposit`) e `canTransition()`.
- **Externo (fora de código):** licença INH, NIF/objeto social, registo APD (transferência
  internacional de dados), manual AML (Lei 8/26), regime fiscal (IVA/selo/industrial), contratos,
  comunicação INH (90 dias), rotação da chave Brevo exposta.

---

## Addendum 15/09/2026 — Painel do Agente (Fase 2, bloco 2)

### Funcionalidades concluídas
- Painel completo em `/conta/agente/{dashboard,comissoes,pagamentos,perfil,definicoes}`.
- Estados de loading/erro/vazio e dados carregados em todas as páginas.
- Valores financeiros sempre calculados no backend (`lib/agentPayout.ts`) e formatados na UI
  (`components/agent-labels.ts`, `Intl pt-AO` com milhares separados por NBSP).

### Rotas criadas
- UI: `app/conta/agente/layout.tsx` (guarda server + nav), `page.tsx` (redirect → dashboard),
  `dashboard/page.tsx`, `comissoes/page.tsx` (filtros status + intervalo de datas),
  `pagamentos/page.tsx` (botão "Solicitar pagamento" + gate server-side),
  `perfil/page.tsx` (telefone/banco), `definicoes/page.tsx` (método/regime só-leitura).
- API: `app/api/agente/dashboard/route.ts` (GET), `app/api/agente/comissoes/route.ts` (GET, filtros,
  `take 100`), `app/api/agente/pagamentos/route.ts` (GET + resultado do gate),
  `app/api/agente/perfil/route.ts` (GET/PATCH — só próprios campos, regex `+244\d{9}`, sanitize),
  `app/api/agente/pagamento-solicitar/route.ts` (POST — CSRF, idempotência, transação).
- Link á"Painel do Agente" em `app/conta/layout.tsx` para `role === "AGENT"`.

### Serviços utilizados
- `lib/agentAccess.ts` (autorização 401/403), `lib/agentAuth.ts` (`requireAgent`, com CSRF),
  `lib/agentPayout.ts` (aggregateCommissions, canRequestPayout, buildPayoutRequest,
  normalizeIdempotencyKey, `MIN_PAYOUT_MINOR = 1_000_000n`), `lib/agentOps.ts` (resumo
  delega no `dealStateMachine`), `lib/commission.ts` (cálculo/persistência no backend — nunca no
  frontend), `lib/dealStateMachine.ts` (transições/autoridade de estados).
- Reutilizados: `lib/prisma.ts`, `lib/auth.ts`, padrões de `/admin` e `middleware.ts`.
- Fase 1 `app/agente/*` mantida intacta (paginas clássicas do painel).

### Regras de autorização aplicadas
- `agentId` vem SEMPRE da sessão (`userId`); nunca aceite do body/query/URL.
- 401 = sem sessão; 403 = sessão válida sem permissão (role ≠ AGENT ou sem perfil de agente).
- Todas as queries de comissões/pagamentos filtram pelo agente autenticado.
- Agente não altera role, status, percentuais, nem estados de pagamento.
- Gate `canRequestPayout` também aplicado no servidor (não só na UI).
- Idempotência: header `x-idempotency-key`, chave única no schema (`AgentPayout.idempotencyKey @unique`),
  transação + P2002 → devolve registo existente.
- Nada sensível exposto: IBAN mascarado, sem tokens/segregados.

### Role system (evidência)
- `Role` real no schema: `USER | VERIFIED_SELLER | PRO | ENTERPRISE | AGENT | ADMIN` — **não existe
  `MANAGER`**. `lib/accessPolicy.ts` é o sistema de funções OPERACIONAIS da consola v3
  (`OperatorRoleName`, inclui `AGENT`); não se aplica ao painel público. Decisão documentada no cabeçalho
  de `lib/agentAccess.ts`. O painel usa a role canónica `Role` (padrão das rotas `/admin`).

### Referrals — decisão: OMITIDO
- `rg -ni "referral|invite|indicação|indicacao|referred|referrer"` em `prisma`, `lib`, `app`, `components`:
  só ocorrências de `rel="noopener noreferrer"` (atributo HTML). Sem modelo, relação, endpoint ou
  requisito — conceito não existe no modelo de negócio → página/rotas não criadas.

### Testes
- Novos: `test-agentaccess.mjs` (5), `test-agentpayout.mjs` (12), `test-agentlabels.mjs` (6).
- `test-agentops.mjs` corrigido: "última compensação" agora = última **PAID** (bug em `agentOps.ts`
  apanhava DRAFT/Aprovadas também), e expectativa de `allowedDealStages("LEAD")` alinhada com o
  `dealStateMachine` (QUEUED + saídas de exceção por design).
- Bateria total: **27/27 ficheiros de teste a passar** (sem `--experimental-strip-types`, Node 24).

### Schema (aditivo, justificado)
- `Commission.createdAt`, `AgentPayout.createdAt/failureReason/idempotencyKey(@unique)`,
  `Deal.createdAt` (pags. Fase 1/`agentOps` já o exigiam para ordenação/idade). Baseline
  `20260915000000_init/migration.sql` atualizada; DDL aditivo aplicado em Postgres local
  (127.0.0.1:5432, db `intermediario`). `prisma generate` OK.

### Comandos e resultados
- `npx tsc --noEmit` → **0 erros** (após `Deal.createdAt`; sem esse campo as páginas Fase 1 tinham
  erros de tipo em cadeia).
- `eslint` (escopo do agente: `app/api/agente`, `app/conta/agente`, `app/agente`, `components/useApi`,
  `components/agent-*`, `lib/agent*`, `test-agent*.mjs`) → **0 erros**.
- `npm run lint` (global) → **51 erros pré-existentes fora do escopo**: `no-require-imports` em scripts
  CommonJS (`server.js`, `seed-*.js`, `e2e-*.js`, `db-status.js`, `backfill-email.js`,
  `promote-admin.js`, `test-commission.js`); `react-hooks` v6 `set-state-in-effect`/`refs` em
  `app/mensagens/page.tsx`, `components/Navbar.tsx`, `components/Gallery.tsx`,
  `components/ActivityContextSelector.tsx`, `components/NotificationBell.tsx`;
  `prefer-as-const`/`prefer-const` em `services/paymentProvider.ts` e `lib/documentEngine.ts`;
  `react/no-unescaped-entities` em `app/admin/denuncias/page.tsx`. A correção exige refatorar
  módulos fora do painel (fora do âmbito).
- Bateria `node test-*.mjs` → **27/27 PASS**.
- `npm run build` (next build, Turbopack) → **exit 0** (TS interno 4.4 min + 59 páginas estáticas;
  inclui `/conta/agente/*` e `/api/agente/*`).
- Middleware: `PROTECTED_PREFIXES = [/conta, /mensagens, /admin, /vender]` (inalterado); `/conta/agente`
  protegido pelo prefixo `/conta`. `/agente/*` (Fase 1) permanece fora (estado pré-existente).

### Pendências / limitações
- Dev server não iniciado nesta ronda (memória RAM limitada); sugerir `npm run dev` para smoke test
  das páginas.
- Lint global com **51 erros pré-existentes fora do escopo do painel** (ver "Comandos e resultados");
  o escopo do painel está a 0 erros. Corrigir o global implica refatorar módulos fora do âmbito.
- Postgres local arrancado manualmente (`pg_ctl start -D C:\Users\Kazim\tools\pg\data`); não é serviço.
- Migration baseline regenerada por edição manual determinística (o `prisma migrate diff` estourou
  memória RAM nesta máquina).

---

## Addendum 16/09/2026 — Painel do Vendedor (Fase 3, bloco 3)

### Funcionalidades concluídas
- Painel completo em `/conta/vendedor/{dashboard,negocios,comissoes}` (sem pagamentos — o vendedor
  não levanta fundos; os 90% são transferidos/informativos via `SellerTransfer`).
- Estados de loading/erro/vazio em todas as páginas, dados carregados via API.
- Filtros por estado e intervalo de datas em negócios e comissões.
- Link "🛍️ Painel do Vendedor" sempre visível em `app/conta/layout.tsx` (qualquer utilizador
  autenticado pode vender — sem gate de role).

### Rotas criadas
- UI: `app/conta/vendedor/layout.tsx` (guarda server por sessão, nav Dashboard/Negócios/Comissões +
  links para áreas existentes), `page.tsx` (redirect → dashboard),
  `dashboard/page.tsx` (StatCards + listas recentes), `negocios/page.tsx` (filtros + tabela),
  `comissoes/page.tsx` (filtros + tabela com breakdown agente/plataforma).
- API: `app/api/vendedor/dashboard/route.ts` (GET — contagens, finanças, listas recentes),
  `app/api/vendedor/negocios/route.ts` (GET — filtros status+datas, `take 100`),
  `app/api/vendedor/comissoes/route.ts` (GET — filtros status+datas, `take 100`).

### Serviços utilizados
- `lib/sellerFinance.ts` (agregados puras: `sellerFinanceSummary`, `sellerDealSummary`,
  `sumTransfersMinor`; tipos `SellerCommissionLike`, `SellerDealLike`).
- `lib/sellerAuth.ts` (`requireSeller`: 401 sem sessão; CSRF via `assertSameOrigin` de `@/lib/security`).
- `lib/commission.ts` (`toMinor` para converter `Reservation.totalPrice` Decimal → cêntimos).
- Reutilizados: `components/agent-ui.tsx` (Card, StatusBadge, LoadingBox, ErrorBox, EmptyBox, StatCard),
  `components/useApi.ts` (hook fetch), `lib/prisma.ts`, `lib/auth.ts`.
- `components/seller-labels.ts`: `RESERVATION_STATUS_LABEL`, `DEAL_TYPE_LABEL` + re-exports de
  `COMMISSION_STATUS_LABEL` e `formatCentsToKz` de `components/agent-labels.ts`.

### Regras de autorização
- 401 sem sessão; qualquer utilizador autenticado pode vender (sem gate de role).
- `userId` vem SEMPRE da sessão (nunca body/query/headers).
- Todas as queries filtram por `sellerId = sessão.user.id` (via `deal.sellerId` ou `listing.userId`).
- Vendedor não altera estados de deal nem de comissão — apenas visualiza.
- Sem endpoint de levantamento (SellerTransfer é registo informativo — 90% já pagos ao vendedor).

### Decisões de design
- **Sem gate de role**: `Listing.userId` não requer `VERIFIED_SELLER` — qualquer utilizador autenticado
  pode publicar e vender. O link no sidebar aparece sempre para sessão válida.
- **Sem página de pagamentos**: o vendedor recebe diretamente (STC/Multicaixa/PayPay/Cheque) —
  `SellerTransfer` é registo contabilístico. Se no futuro houver payout ao vendedor, criar
  `app/conta/vendedor/pagamentos/` espelhando o padrão do agente.
- **Dashboard sem SLA de primeiro contacto** (reservado a agentes operacionais).

### Testes
- `test-sellerfinance.mjs` (15): sellerFinanceSummary (5 estados), sumTransfersMinor (2),
  sellerDealSummary (8 — open/won/lost, BLOQUEADO_POR_RISCO como open, REEMBOLSO_CONCLUIDO como
  won, SELLER_WITHDREW/BUYER_WITHDREW/REEMBOLSO_PENDENTE/FRAUDE_EM_INVESTIGACAO como lost).
- `test-sellerlabels.mjs` (4): RESERVATION_STATUS_LABEL (2), DEAL_TYPE_LABEL (2).
- Bateria total: **54/54 PASS** (5 agentaccess + 12 agentpayout + 6 agentlabels + 12 agentops +
  15 sellerfinance + 4 sellerlabels).

### Comandos e resultados
- `npx tsc --noEmit` → **0 erros** (verificado via `next build` Turbopack — TS interno 3.8 min).
- `npm run build` (next build, Turbopack) → **exit 0** (66 páginas, era 59; inclui todas as rotas
  `/conta/vendedor/*` e `/api/vendedor/*`).
- Bateria `node test-*.mjs` → **54/54 PASS** (sem `--experimental-strip-types`, Node 24).
- Sem erros de lint no escopo do vendedor (arquivos `seller-*`, `app/conta/vendedor/`,
  `app/api/vendedor/`).

### Arquivos criados/modificados
- **Novos**: `lib/sellerFinance.ts`, `lib/sellerAuth.ts`, `components/seller-labels.ts`,
  `test-sellerfinance.mjs`, `test-sellerlabels.mjs`.
- **Novas rotas**: `app/api/vendedor/{dashboard,negocios,comissoes}/route.ts`.
- **Novas páginas**: `app/conta/vendedor/{layout,page,dashboard,negocios,comissoes}.tsx`.
- **Modificado**: `app/conta/layout.tsx` (+link Painel do Vendedor).

### Pendências / limitações
- Dev server não iniciado nesta ronda (memória RAM limitada); sugerir `npm run dev` para smoke test.
- Lint global mantém **51 erros pré-existentes** fora do escopo (inalterado desde Fase 2).