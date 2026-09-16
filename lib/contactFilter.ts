// ---------------------------------------------------------------------------
// Anti-desintermediação (v2, sec. 8.2) — filtro de contactos em texto livre.
// Deteta telefones, emails (incl. ofuscados "joao(at)mail.com"), @handles,
// links WhatsApp/Telegram e números escritos por extenso. Deve correr em TODAS
// as mensagens e campos livres (descrição, título, legendas) antes de gravar.
// ---------------------------------------------------------------------------

export type ContactType = "phone" | "email" | "handle" | "link" | "spelled-digits";

export interface ContactMatch {
  type: ContactType;
  value: string;
  start: number;
  end: number;
}

// Telefone angolano (+244/00244/244 opcional, fixo 2xx ou móvel 9xx, 9 dígitos
// no total, com separadores arbitrários: "9 1 2 3 4 5 6 7 8", "912-345-678",
// "+244 923 456 789"). Lookaround impede falsos-positivos dentro de séries numéricas.
const PHONE_RE = /(?<!\d)(?:(?:\+|00)?244[\s.\-()]*)?(?:9|2)(?:[\s.\-()]*\d){8}(?!\d)/g;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const OBFUSCATED_EMAIL_RE = /(?<![A-Za-z0-9.])[A-Za-z0-9._%+-]+\(at\)[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}\b/g;
const HANDLE_RE = /(?:^|\s)(@[A-Za-z][A-Za-z0-9_.]{1,29})/g;
const LINK_RE = /(?:https?:\/\/\S+|\b(?:wa\.me|whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.(?:me|dog))\S*)/gi;

const DIGIT_WORDS = ["zero", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"];
// 3+ dígitos por extenso seguidos (com ou sem separadores/e): "nove um dois tres"
const SPELLED_RE = new RegExp(
  `\\b(?:${DIGIT_WORDS.join("|")})(?:[\\s,.\\-]*e?[\\s,.-]*(?:${DIGIT_WORDS.join("|")})){2,}\\b`,
  "gi",
);

const MATCHERS: { type: ContactType; re: RegExp; priority: number }[] = [
  { type: "link", re: LINK_RE, priority: 1 },
  { type: "email", re: OBFUSCATED_EMAIL_RE, priority: 2 },
  { type: "email", re: EMAIL_RE, priority: 3 },
  { type: "phone", re: PHONE_RE, priority: 4 },
  { type: "handle", re: HANDLE_RE, priority: 5 },
  { type: "spelled-digits", re: SPELLED_RE, priority: 6 },
];

/** Procura todos os contactos num texto, sem sobreposições (mais específico primeiro). */
export function findContacts(content: string): ContactMatch[] {
  type RawMatch = ContactMatch & { priority: number };
  const found: RawMatch[] = [];

  for (const { type, re, priority } of MATCHERS) {
    re.lastIndex = 0;
    for (const m of content.matchAll(re)) {
      if (m.index === undefined) continue;
      found.push({
        type,
        value: m[0].trim(),
        start: m.index,
        end: m.index + m[0].length,
        priority,
      });
    }
  }

  found.sort((a, b) => a.start - b.start || a.priority - b.priority);

  const result: ContactMatch[] = [];
  let lastEnd = -1;
  for (const m of found) {
    if (m.start < lastEnd) continue; // sobreposição com match mais específico
    result.push({ type: m.type, value: m.value, start: m.start, end: m.end });
    lastEnd = m.end;
  }
  return result;
}

/** true se o texto contiver qualquer sinal de contacto. */
export function containsContact(content: string): boolean {
  return findContacts(content).length > 0;
}

const MASK: Record<ContactType, string> = {
  phone: "[telefone oculto]",
  email: "[contacto oculto]",
  handle: "[contacto oculto]",
  link: "[link oculto]",
  "spelled-digits": "[numero oculto]",
};

/** Substitui contactos pelo respetivo placeholder (nunca expõe o valor original). */
export function sanitizeContacts(content: string): string {
  const matches = findContacts(content);
  if (matches.length === 0) return content;

  let out = "";
  let cursor = 0;
  for (const m of matches) {
    out += content.slice(cursor, m.start) + MASK[m.type];
    cursor = m.end;
  }
  return out + content.slice(cursor);
}