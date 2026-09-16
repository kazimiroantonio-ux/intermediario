import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import { assertSameOrigin, rateLimit, clientIp } from "@/lib/security";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rl = rateLimit(`upload:${clientIp(request)}`, 30, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados uploads. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const dataUrl = body.dataUrl ?? "";
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Formato de imagem não suportado." }, { status: 400 });
  }

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagem demasiado grande (máx. 8MB)." }, { status: 400 });
  }

  const url = await saveImage(buffer, MIME_EXT[mime], mime);
  return NextResponse.json({ url });
}
