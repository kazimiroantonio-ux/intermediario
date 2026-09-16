// ---------------------------------------------------------------------------
// Pipeline de upload seguro (spec v3 sec. 5 — OWASP Top10:2025, uploads).
// Etapas 1-3+7 do fluxo obrigatório: validar tipo REAL (magic bytes), limite
// de tamanho, renomeação segura (UUID), hash sha256. As etapas de antivírus/
// análise/armazenamento privado vivem à volta (rotas/storage), o hash e a
// validação são puros aqui e testáveis sem BD.
// Aceita apenas PDF, JPG e PNG — nunca executáveis.
// ---------------------------------------------------------------------------

import { createHash, randomUUID } from "node:crypto";

export type AllowedFormat = "pdf" | "jpg" | "png";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_FORMATS: AllowedFormat[] = ["pdf", "jpg", "png"];

export const EXTENSIONS: Record<AllowedFormat, string> = {
  pdf: ".pdf",
  jpg: ".jpg",
  png: ".png",
};

export const MIME_BY_FORMAT: Record<AllowedFormat, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

export class UploadError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

const MAGIC: Record<AllowedFormat, Buffer> = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  jpg: Buffer.from([0xff, 0xd8, 0xff]), // FF D8 FF
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};

/** Deteta o formato real pelos primeiros bytes (nunca pela extensão). */
export function detectFormat(bytes: Buffer): AllowedFormat | null {
  for (const fmt of ALLOWED_FORMATS) {
    const magic = MAGIC[fmt];
    if (bytes.length >= magic.length && bytes.subarray(0, magic.length).equals(magic)) {
      return fmt;
    }
  }
  return null;
}

function extToFormat(filename: string): AllowedFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png")) return "png";
  return null;
}

export interface UploadResult {
  format: AllowedFormat;
  mime: string;
  size: number;
  hash: string;
  storageName: string;
  originalName: string;
}

export function computeFileHash(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Renomeação segura: UUID + extensão do formato REAL (nunca o nome fornecido). */
export function safeStorageName(format: AllowedFormat): string {
  return `${randomUUID()}${EXTENSIONS[format]}`;
}

export interface UploadSpec {
  bytes: Buffer;
  /** nome original fornecido pelo cliente (só para registo/auditoria) */
  filename?: string;
  maxBytes?: number;
}

/** Valida o ficheiro e devolve hash + nome seguro. Lança UploadError. */
export function validateUpload(input: UploadSpec): UploadResult {
  const bytes = input.bytes;
  const max = input.maxBytes ?? MAX_UPLOAD_BYTES;

  if (bytes.length === 0) {
    throw new UploadError("EMPTY", "Ficheiro vazio.");
  }
  if (bytes.length > max) {
    throw new UploadError(
      "TOO_LARGE",
      `Ficheiro excede o limite de ${Math.round(max / 1024 / 1024)} MB.`
    );
  }

  const format = detectFormat(bytes);
  if (!format) {
    throw new UploadError(
      "UNSUPPORTED_TYPE",
      `Formato não aceite. Permitidos: ${ALLOWED_FORMATS.join(", ")}.`
    );
  }

  if (input.filename !== undefined && input.filename.trim() !== "") {
    const claimed = extToFormat(input.filename);
    if (claimed !== format) {
      throw new UploadError(
        "EXTENSION_MISMATCH",
        `A extensão "${input.filename}" não corresponde ao conteúdo detetado (${format}).`
      );
    }
  }

  return {
    format,
    mime: MIME_BY_FORMAT[format],
    size: bytes.length,
    hash: computeFileHash(bytes),
    storageName: safeStorageName(format),
    originalName: input.filename ?? "",
  };
}