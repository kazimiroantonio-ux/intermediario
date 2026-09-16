// Gestão de sessões/dispositivos (spec v3 §5 — segurança da conta).
// Lógica pura e determinística: preparação da lista para UI e plano de
// revogação. A execução (listar/revogar no better-auth) fica nas rotas.

export type SessionRaw = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  expiresAt?: Date | string | number | null;
};

export type DeviceInfo = {
  browser: string;
  os: string;
  mobile: boolean;
};

export type SessionView = {
  id: string;
  device: string;
  browser: string;
  os: string;
  mobile: boolean;
  ip: string;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
};

export type RevokePlan =
  | { ok: true; tokens: string[] }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// User-Agent → dispositivo
// ---------------------------------------------------------------------------

const BROWSERS: Array<[RegExp, string]> = [
  [/edg\//i, "Edge"],
  [/opr\//i, "Opera"],
  [/chrome\//i, "Chrome"],
  [/firefox\//i, "Firefox"],
  [/safari\//i, "Safari"],
];

const OPERATING_SYSTEMS: Array<[RegExp, string]> = [
  [/windows nt 10/i, "Windows 10/11"],
  [/windows nt 6\.1/i, "Windows 7"],
  [/android/i, "Android"],
  [/iphone|ipad|ipod/i, "iOS"],
  [/mac os x/i, "macOS"],
  [/linux/i, "Linux"],
];

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua ?? "";
  const browser =
    BROWSERS.find(([re]) => re.test(s))?.[1] ?? "Navegador desconhecido";
  const os = OPERATING_SYSTEMS.find(([re]) => re.test(s))?.[1] ?? "Sistema desconhecido";
  const mobile = /mobi|android|iphone|ipad/i.test(s);
  return { browser, os, mobile };
}

export function deviceLabel(info: DeviceInfo): string {
  const parts = [info.browser, info.os];
  if (info.mobile) parts.push("Telemóvel");
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// IP → localização aproximada (determinística, sem serviços externos)
// ---------------------------------------------------------------------------

export function approximateLocation(ip: string | null | undefined): string {
  const s = (ip ?? "").trim();
  if (!s) return "Localização desconhecida";
  const v4 = s.split(".");
  if (v4.length === 4) {
    const [a, b] = [Number(v4[0]), Number(v4[1])];
    if (a === 127) return "Este dispositivo (loopback)";
    if (a === 10) return "Rede privada";
    if (a === 192 && b === 168) return "Rede privada";
    if (a === 172 && b >= 16 && b <= 31) return "Rede privada";
    if (a === 169 && b === 254) return "Rede de link-local";
  }
  if (s.startsWith("::1")) return "Este dispositivo (loopback)";
  if (s.toLowerCase().startsWith("fe80:")) return "Rede de link-local";
  return "IP público";
}

// ---------------------------------------------------------------------------
// Preparação da lista para a UI
// ---------------------------------------------------------------------------

export function toIso(v: Date | string | number | null | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return new Date(v).toISOString();
}

export function sessionListView(
  raw: SessionRaw[],
  currentToken: string | undefined
): SessionView[] {
  return raw
    .slice()
    .sort((s, t) => {
      const a = new Date(t.updatedAt ?? 0).getTime();
      const b = new Date(s.updatedAt ?? 0).getTime();
      return a - b;
    })
    .map((r) => {
      const device = parseUserAgent(r.userAgent);
      return {
        id: r.id,
        device: deviceLabel(device),
        browser: device.browser,
        os: device.os,
        mobile: device.mobile,
        ip: r.ipAddress ?? "",
        location: approximateLocation(r.ipAddress),
        createdAt: toIso(r.createdAt),
        lastActive: toIso(r.updatedAt),
        isCurrent: !!currentToken && r.token === currentToken,
      };
    });
}

// ---------------------------------------------------------------------------
// Plano de revogação — garante que a sessão atual NUNCA é alvo
// ---------------------------------------------------------------------------

export function planRevokeOthers(
  sessions: SessionRaw[],
  currentToken: string | undefined
): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const s of sessions) {
    if (s.token === currentToken) continue;
    if (seen.has(s.token)) continue;
    seen.add(s.token);
    tokens.push(s.token);
  }
  return tokens;
}

export function planRevokeOne(
  sessions: SessionRaw[],
  currentToken: string | undefined,
  sessionId: string
): RevokePlan {
  const target = sessions.find((s) => s.id === sessionId);
  if (!target) return { ok: false, reason: "Sessão não encontrada." };
  if (target.token === currentToken) {
    return { ok: false, reason: "A sessão atual não pode ser terminada desta forma." };
  }
  return { ok: true, tokens: [target.token] };
}