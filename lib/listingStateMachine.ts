// ---------------------------------------------------------------------------
// Máquina de estados do ANÚNCIO (spec v3 sec. 3): o catálogo também tem ciclo
// de vida próprio e auditoria. RASCUNHO → VERIFICAÇÃO → VERIFICADO → PUBLICADO.
// `ExternalizedStatus` espelha ListingStatus da BD; `Verification` espelha
// ListingVerificationStatus. Pura e determinística.
// Não publicar sem verificação; não editar price/IBAN depois de PUBLICADO sem
// exceção controlada (spec v3 sec. 3 — transições de regra).
// ---------------------------------------------------------------------------

export type ListingStatusName =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "ACTIVE"
  | "EXPIRED"
  | "BLOCKED"
  | "REJECTED"
  | "CLOSED";

export type ListingVerificationName =
  | "NOT_REQUESTED"
  | "PENDING_DOCS"
  | "VERIFIED"
  | "REJECTED";

export const LISTING_FLOW: Record<ListingStatusName, ListingStatusName[]> = {
  DRAFT: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["VERIFIED", "REJECTED"],
  VERIFIED: ["ACTIVE", "BLOCKED"],
  ACTIVE: ["EXPIRED", "BLOCKED", "CLOSED"],
  EXPIRED: ["ACTIVE"], // re-ativar (reverificação continua válida) ou CLOSED
  BLOCKED: ["REJECTED", "PENDING_VERIFICATION"],
  REJECTED: ["DRAFT"], // corrigir e ressubmeter
  CLOSED: [],
};

const TERMINAL: ListingStatusName[] = ["CLOSED"];

/** Guard de "gatilho" obrigatório por transição (verificação concluída, etc.). */
export const LISTING_GATES: Record<string, string[]> = {
  "DRAFT→PENDING_VERIFICATION": ["submittedBySeller"],
  "PENDING_VERIFICATION→VERIFIED": ["docsVerified", "sellerVerified"],
  "VERIFIED→ACTIVE": ["publishApproved"],
  "ACTIVE→CLOSED": ["dealClosed"],
};

export function listingAllowedTransitions(from: ListingStatusName): ListingStatusName[] {
  return LISTING_FLOW[from] ?? [];
}

export function listingCanTransition(
  from: ListingStatusName,
  to: ListingStatusName,
  gates: Record<string, boolean> = {}
): { ok: boolean; missingGates: string[] } {
  const allowed = listingAllowedTransitions(from);
  if (!allowed.includes(to)) {
    return { ok: false, missingGates: [] };
  }
  const required = LISTING_GATES[`${from}→${to}`] ?? [];
  const missingGates = required.filter((g) => gates[g] !== true);
  return { ok: missingGates.length === 0, missingGates };
}

/** A edição de valores sensíveis (preço/IBAN) é bloqueada após PUBLICADO. */
export const SENSITIVE_FIELDS = ["price", "sellerIban"] as const;

export function canEditSensitiveField(input: {
  status: ListingStatusName;
  verifiedDocs: boolean;
  exceptionApproved: boolean;
}): { ok: boolean; reason?: string } {
  if (input.status === "CLOSED") {
    return { ok: false, reason: "Imóvel concluído — dados sensíveis congelados." };
  }
  if (input.status !== "ACTIVE" && input.status !== "VERIFIED") {
    return { ok: true };
  }
  if (!input.verifiedDocs) {
    return { ok: false, reason: "Documentos não verificados — não editar dados sensíveis." };
  }
  if (input.exceptionApproved) {
    return { ok: true, reason: "Exceção aprovada por compliance." };
  }
  return { ok: false, reason: "Bloqueado: edição de dados sensíveis após publicação exige exceção aprovada." };
}