import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type StorageProvider = "local" | "cloudinary" | "s3";

const provider = (process.env.STORAGE_PROVIDER ?? "local") as StorageProvider;

async function saveLocal(buffer: Buffer, ext: string): Promise<string> {
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

// Cloudinary via REST (upload não assinado com preset).
// Requer: STORAGE_PROVIDER=cloudinary, CLOUDINARY_CLOUD_NAME e CLOUDINARY_UPLOAD_PRESET.
async function saveCloudinary(buffer: Buffer, mime: string): Promise<string> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("CLOUDINARY_CLOUD_NAME/CLOUDINARY_UPLOAD_PRESET em falta.");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), `img-${Date.now()}`);
  form.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary falhou: ${res.status}`);
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary não devolveu URL.");
  return data.secure_url;
}

/**
 * Guarda uma imagem e devolve o URL público.
 * Provedor escolhido via STORAGE_PROVIDER (local por defeito).
 * Se um provedor de nuvem falhar/estiver mal configurado, cai para local
 * para que a plataforma nunca perca um upload do utilizador.
 */
export async function saveImage(buffer: Buffer, ext: string, mime: string): Promise<string> {
  try {
    switch (provider) {
      case "cloudinary":
        return await saveCloudinary(buffer, mime);
      case "s3":
        // Integração futura: @aws-sdk/client-s3 + presigned PUT.
        throw new Error("Provedor S3 ainda não implementado.");
      default:
        return await saveLocal(buffer, ext);
    }
  } catch (err) {
    console.error(`[storage:${provider}] fallback para local:`, err instanceof Error ? err.message : err);
    return saveLocal(buffer, ext);
  }
}
