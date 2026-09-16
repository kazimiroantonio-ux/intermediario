// ---------------------------------------------------------------------------
// Abstração PaymentProvider (Anexo B, sec. 5).
// createCharge | verifyCallback | queryStatus | refund | payout.
// Chave de idempotência OBRIGATÓRIA em todas as operações — dois webhooks
// concorrentes nunca marcam a mesma comissão como paga duas vezes.
//
// Sem chaves de API (env) as implementações correm em modo STUB (valores
// simulados), para desenvolvimento/testes. Em produção a integração real é
// acionada pela presença das chaves.
// ---------------------------------------------------------------------------

import { createHash, createHmac, randomBytes } from "node:crypto";

export type ProviderName = "PROXYPAY" | "PAYPAY" | "BANK_TRANSFER";

export type ProviderChargeStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface CreateChargeInput {
  /** cêntimos de Kwanza */
  amountMinor: bigint;
  idempotencyKey: string;
  description: string;
  /** prefixo sugerido para a referência (ex.: id do pagamento) */
  referenceHint?: string;
  ttlHours?: number;
}

export interface ChargeResult {
  provider: ProviderName;
  /** referência Multicaixa (9 dígitos) ou referência/link do provedor */
  reference: string;
  expiresAt: Date;
  checkoutUrl?: string;
}

export interface VerifyCallbackResult {
  provider: ProviderName;
  reference: string;
  /** transação no banco/provedor — chave única de idempotência do webhook */
  bankTxnRef?: string;
  amountMinor?: bigint;
  status: ProviderChargeStatus;
  raw: unknown;
}

export interface RefundInput {
  reference: string;
  /** cêntimos a devolver (pode ser parcial) */
  amountMinor: bigint;
  idempotencyKey: string;
  reason: string;
}

export interface RefundResult {
  ok: boolean;
  idempotencyKey: string;
}

export interface PayoutInput {
  amountMinor: bigint;
  destination: string;
  idempotencyKey: string;
  method: "transfer_to_card" | "transfer_to_account" | "bank_transfer";
}

export interface PayoutResult {
  ok: boolean;
  reference: string;
  status: "PENDING" | "DONE" | "FAILED";
}

export class ProviderError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Idempotência
// ---------------------------------------------------------------------------

/** Chave de idempotência determinística a partir de um scope + id de negócio. */
export function makeIdempotencyKey(scope: string, id: string): string {
  return createHash("sha256").update(`${scope}:${id}`).digest("hex");
}

export function assertIdempotencyKey(key: string): void {
  if (!key || key.length > 128) {
    throw new ProviderError("Chave de idempotência ausente ou inválida.", 400);
  }
}

/**
 * Guarda em memória para webhooks concorrentes. Sem isto, dois callbacks
 * paralelos (mesmo bankTxnRef) atravessam a mesma transição de estado.
 * Em produção, o guard da BD é bankTxnRef @unique (ON CONFLICT DO NOTHING);
 * esta guarda é a barreira antes da escrita.
 */
export class IdempotencyGuard {
  private readonly ttlMs: number;
  private readonly seen = new Map<string, number>();

  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  has(key: string): boolean {
    const at = this.seen.get(key);
    return at !== undefined && Date.now() - at < this.ttlMs;
  }

  mark(key: string): void {
    this.seen.set(key, Date.now());
  }

  unmark(key: string): void {
    this.seen.delete(key);
  }
}

/** Assinatura HMAC-SHA256 hex de um payload (rótulos de webhook e testes). */
export function hmacSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// ---------------------------------------------------------------------------
// Conversões de unidade (cêntimos <-> Kwanza)
// ---------------------------------------------------------------------------

export function minorToKz(minor: bigint): string {
  return (Number(minor) / 100).toFixed(2);
}

export function kzToMinor(kz: number | string): bigint {
  return BigInt(Math.round(Number(kz) * 100));
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface PaymentProvider {
  readonly name: ProviderName;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  verifyCallback(
    body: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<VerifyCallbackResult | null>;
  queryStatus(reference: string): Promise<ProviderChargeStatus>;
  refund(input: RefundInput): Promise<RefundResult>;
  payout(input: PayoutInput): Promise<PayoutResult>;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  const v = headers?.[name];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

function randomNumeric(length: number): string {
  const block = String(Math.floor(100000000 + Math.random() * 900000000));
  let digits = block;
  while (digits.length < length) digits += block;
  return digits.slice(0, length);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function verifyHmacSignature(
  secret: string, // sem segredo => modo stub/dev, não valida
  body: unknown,
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string
): void {
  if (!secret) return;
  const received = headerValue(headers, headerName);
  if (!received) {
    throw new ProviderError(`Falta assinatura de webhook (${headerName}).`, 401);
  }
  const expected = hmacSignature(secret, JSON.stringify(body));
  if (received !== expected) {
    throw new ProviderError("Assinatura de webhook inválida.", 401);
  }
}

function normalizeStatus(value: unknown, fallback: ProviderChargeStatus): ProviderChargeStatus {
  const s = String(value ?? "").toUpperCase().replace(/\s+/g, "_");
  if (s.includes("PAID") || s === "SUCCESS" || s === "CONFIRMED" || s === "DONE") return "PAID";
  if (s.includes("EXPIRED") || s === "CANCELLED" || s === "CANCELED") return "EXPIRED";
  if (s.includes("REFUND")) {
    return s.includes("PARTIAL") ? "PARTIALLY_REFUNDED" : "REFUNDED";
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// ProxyPay — Multicaixa Express (referência de 9 dígitos)
// ---------------------------------------------------------------------------

export class ProxyPayProvider implements PaymentProvider {
  readonly name: "PROXYPAY" = "PROXYPAY";

  private readonly apiKey: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly entity: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.PROXYPAY_API_KEY;
    this.webhookSecret = env.PROXYPAY_WEBHOOK_SECRET;
    this.baseUrl = env.PROXYPAY_BASE_URL || "https://api.proxypay.co.ao";
    this.entity = env.MULTICAIXA_ENTITY || "12345";
  }

  private get real(): boolean {
    return Boolean(this.apiKey);
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    assertIdempotencyKey(input.idempotencyKey);

    const ttlHours = input.ttlHours ?? 48;
    if (!this.real) {
      // Stub — espelha o ProxyPayService atual (desenvolvimento/testes)
      const reference = randomNumeric(9);
      return {
        provider: this.name,
        reference,
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
      };
    }

    const res = await fetch(`${this.baseUrl}/references`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        entity: this.entity,
        reference: input.referenceHint,
        amount: minorToKz(input.amountMinor),
        currency: "AOA",
      }),
    });
    if (!res.ok) throw new ProviderError(`ProxyPay createCharge ${res.status}`, res.status);
    const data = toRecord(await res.json());
    return {
      provider: this.name,
      reference: String(data.reference ?? input.referenceHint ?? ""),
      expiresAt: new Date(String(data.expiration || Date.now() + ttlHours * 3_600_000)),
    };
  }

  async verifyCallback(
    body: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<VerifyCallbackResult | null> {
    verifyHmacSignature(this.webhookSecret ?? "", body, headers, "x-proxypay-signature");
    const data = toRecord(body);
    const reference = String(data.reference ?? "");
    if (!reference) return null;
    return {
      provider: this.name,
      reference,
      bankTxnRef: data.transaction_id ? String(data.transaction_id) : undefined,
      amountMinor: data.amount !== undefined ? kzToMinor(String(data.amount)) : undefined,
      status: normalizeStatus(data.status, "PENDING"),
      raw: body,
    };
  }

  // Sem `real` podemos consultar o estado da referência na API do provedor.
  async queryStatus(reference: string): Promise<ProviderChargeStatus> {
    if (!this.real || !reference) return "PENDING";
    const res = await fetch(`${this.baseUrl}/references/${reference}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) return "PENDING";
    const data = toRecord(await res.json());
    return normalizeStatus(data.status, "PENDING");
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    assertIdempotencyKey(input.idempotencyKey);
    if (this.real) {
      const res = await fetch(`${this.baseUrl}/references/${input.reference}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({ amount: minorToKz(input.amountMinor), reason: input.reason }),
      });
      if (!res.ok) throw new ProviderError(`ProxyPay refund ${res.status}`, res.status);
    }
    return { ok: true, idempotencyKey: input.idempotencyKey };
  }

  payout(): Promise<PayoutResult> {
    throw new ProviderError("ProxyPay não suporta payouts — usar PayPay.", 400);
  }
}

// ---------------------------------------------------------------------------
// PayPay — referências, Express, QR, Kwik; payouts transfer_to_card/account
// ---------------------------------------------------------------------------

export class PayPayProvider implements PaymentProvider {
  readonly name: "PAYPAY" = "PAYPAY";

  private readonly apiKey: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly checkoutBaseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.PAYPAY_API_KEY;
    this.webhookSecret = env.PAYPAY_WEBHOOK_SECRET;
    this.baseUrl = env.PAYPAY_BASE_URL || "https://api.paypay.ao";
    this.checkoutBaseUrl = env.PAYPAY_CHECKOUT_BASE_URL || "https://paypay.express/checkout";
  }

  private get real(): boolean {
    return Boolean(this.apiKey);
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    assertIdempotencyKey(input.idempotencyKey);

    const ttlHours = input.ttlHours ?? 24;
    if (!this.real) {
      const reference = randomBytes(8).toString("hex").toUpperCase();
      return {
        provider: this.name,
        reference,
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
        checkoutUrl: `${this.checkoutBaseUrl}/${reference}`,
      };
    }

    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        amount: minorToKz(input.amountMinor),
        currency: "AOA",
        correlation_id: input.idempotencyKey,
        description: input.description,
      }),
    });
    if (!res.ok) throw new ProviderError(`PayPay createCharge ${res.status}`, res.status);
    const data = toRecord(await res.json());
    return {
      provider: this.name,
      reference: String(data.reference ?? ""),
      expiresAt: new Date(String(data.expiration || Date.now() + ttlHours * 3_600_000)),
      checkoutUrl: data.checkout_url ? String(data.checkout_url) : undefined,
    };
  }

  async verifyCallback(
    body: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<VerifyCallbackResult | null> {
    verifyHmacSignature(this.webhookSecret ?? "", body, headers, "x-paypay-signature");
    const data = toRecord(body);
    const reference = String(data.reference ?? "");
    if (!reference) return null;
    return {
      provider: this.name,
      reference,
      bankTxnRef: data.transaction_id ? String(data.transaction_id) : undefined,
      amountMinor: data.amount !== undefined ? kzToMinor(String(data.amount)) : undefined,
      status: normalizeStatus(data.status, "PENDING"),
      raw: body,
    };
  }

  async queryStatus(reference: string): Promise<ProviderChargeStatus> {
    if (!this.real || !reference) return "PENDING";
    const res = await fetch(`${this.baseUrl}/transactions/${reference}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) return "PENDING";
    const data = toRecord(await res.json());
    return normalizeStatus(data.status, "PENDING");
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    assertIdempotencyKey(input.idempotencyKey);
    if (this.real) {
      const res = await fetch(`${this.baseUrl}/transactions/${input.reference}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({ amount: minorToKz(input.amountMinor), reason: input.reason }),
      });
      if (!res.ok) throw new ProviderError(`PayPay refund ${res.status}`, res.status);
    }
    return { ok: true, idempotencyKey: input.idempotencyKey };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    assertIdempotencyKey(input.idempotencyKey);
    if (this.real) {
      const res = await fetch(`${this.baseUrl}/transfers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          amount: minorToKz(input.amountMinor),
          currency: "AOA",
          method: input.method,
          account: input.destination,
          correlation_id: input.idempotencyKey,
        }),
      });
      if (!res.ok) throw new ProviderError(`PayPay payout ${res.status}`, res.status);
      const data = toRecord(await res.json());
      return {
        ok: true,
        reference: String(data.reference ?? ""),
        status: normalizeStatus(data.status, "PENDING") === "PAID" ? "DONE" : "PENDING",
      };
    }
    return { ok: true, reference: `PPO-${randomBytes(6).toString("hex")}`, status: "PENDING" };
  }
}

// ---------------------------------------------------------------------------
// BANK_TRANSFER — transferência bancária (STC) no ato; confirmação admin/dono
// ---------------------------------------------------------------------------

export class BankTransferProvider implements PaymentProvider {
  readonly name: "BANK_TRANSFER" = "BANK_TRANSFER";

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    assertIdempotencyKey(input.idempotencyKey);
    const reference = input.referenceHint || `BTR-${randomBytes(6).toString("hex")}`;
    return {
      provider: this.name,
      reference,
      expiresAt: new Date(Date.now() + 365 * 24 * 3_600_000),
    };
  }

  // Sem webhook: a confirmação é manual (admin/dono marca PAID na consola).
  verifyCallback(): Promise<VerifyCallbackResult | null> {
    return Promise.resolve(null);
  }

  queryStatus(): Promise<ProviderChargeStatus> {
    return Promise.resolve("PENDING");
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    assertIdempotencyKey(input.idempotencyKey);
    return { ok: true, idempotencyKey: input.idempotencyKey };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    assertIdempotencyKey(input.idempotencyKey);
    return { ok: true, reference: `OUT-${randomBytes(6).toString("hex")}`, status: "DONE" };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let proxyPay: ProxyPayProvider | undefined;
let payPay: PayPayProvider | undefined;
let bankTransfer: BankTransferProvider | undefined;

export function getPaymentProvider(name: ProviderName | string): PaymentProvider {
  switch (name) {
    case "PROXYPAY":
      proxyPay ??= new ProxyPayProvider();
      return proxyPay;
    case "PAYPAY":
      payPay ??= new PayPayProvider();
      return payPay;
    case "BANK_TRANSFER":
      bankTransfer ??= new BankTransferProvider();
      return bankTransfer;
    default:
      throw new ProviderError(`Provedor de pagamento desconhecido: ${name}`, 400);
  }
}