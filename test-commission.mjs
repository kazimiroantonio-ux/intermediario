import {
  computeCommission,
  computeAgreement,
  toMinor,
  fromMinor,
  DEFAULT_SITE_RATE_BPS,
  DEFAULT_AGENT_SHARE_BPS,
  DEFAULT_VAT_BPS,
  PLAN_RATE_BPS,
  COMMISSION_MIN_MINOR,
  commissionMinMinor,
} from "./lib/commission.ts";

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS |", name); }
  else { fail++; console.log("FAIL |", name, detail ?? ""); }
}

// 1. 10% exato: 10.000.000 Kz → 1.000.000 Kz de comissão total
const r1 = computeCommission(toMinor(10_000_000));
check("10% exato (10M Kz → 1.000.000 Kz)", r1.totalCommission === 100_000_000n);
check("Split 50/50 com agente", r1.agentAmount === 50_000_000n && r1.platformAmount === 50_000_000n);
check("Platform = total - agent (no lost cents)", r1.platformAmount === r1.totalCommission - r1.agentAmount);
check("Defaults expostos (rate 1000, split 5000)", r1.rateBps === DEFAULT_SITE_RATE_BPS && r1.agentShareBps === DEFAULT_AGENT_SHARE_BPS);

// 2. Planos reduzidos: a parte do agente (50%) sai da fatia do site
const TABLE = {
  USER: [1000, 100_000_000n, 50_000_000n],
  VERIFIED_SELLER: [900, 90_000_000n, 45_000_000n],
  PRO: [800, 80_000_000n, 40_000_000n],
  ENTERPRISE: [700, 70_000_000n, 35_000_000n],
};
for (const [plan, spec] of Object.entries(TABLE)) {
  const [bps, total, agent] = spec;
  const r = computeCommission(toMinor(10_000_000), bps);
  check(`Plano ${plan} (${bps} bps): total`, PLAN_RATE_BPS[plan] === bps && r.totalCommission === total);
  check(`Plano ${plan}: split 50% para o agente`, r.agentAmount === agent && r.platformAmount === total - agent);
  check(`Plano ${plan}: site assume a diferença`, r.platformAmount === agent); // 50/50 puro
}

// 3. Valores ímpares: arredondamento nunca perde cêntimos, a favor da plataforma
const odds = [999_999n, toMinor(999_999), 1_357_913_579_241n];
for (const odd of odds) {
  const r3 = computeCommission(odd);
  check(`Ímpar(${odd}): total inteiro e não-negativo`, r3.totalCommission >= 0n);
  check(`Ímpar(${odd}): soma das partes = total`, r3.agentAmount + r3.platformAmount === r3.totalCommission);
  check(`Ímpar(${odd}): plataforma nunca perde (50/50)`, r3.platformAmount >= r3.agentAmount);
}

// 4. dealAmount = 0 → aplica o mínimo
const r4 = computeCommission(0n);
check("dealAmount=0 → comissão mínima", r4.totalCommission === COMMISSION_MIN_MINOR);
check("dealAmount=0 → usedMinimum=true", r4.usedMinimum === true);
check("dealAmount=0 → split do mínimo", r4.platformAmount === COMMISSION_MIN_MINOR - r4.agentAmount);

// 5. Valores muito grandes: sem overflow (BigInt)
const huge = BigInt("1000000000000000"); // 1.000.000.000.000 Kz em cêntimos
const r5 = computeCommission(huge);
check("Overflow: 1e15 cêntimos computado", r5.totalCommission === (huge * BigInt(DEFAULT_SITE_RATE_BPS)) / 10000n);
check("Overflow: soma preservada", r5.agentAmount + r5.platformAmount === r5.totalCommission);

// 6. Exactamente no limiar (10.000 Kz → 1.000 Kz = mínimo): não força mínimo
const r7 = computeCommission(toMinor(10_000));
check("No limiar exacto (10.000 Kz → 1.000 Kz)", r7.totalCommission === COMMISSION_MIN_MINOR && r7.usedMinimum === false);

// 7. Mínimo por categoria (imóveis = 15.000 Kz) aplica-se antes do split
const minImoveis = commissionMinMinor("imoveis");
check("Min por categoria imóveis = 1.500.000 cêntimos", minImoveis === 1_500_000n);
check("Categoria desconhecida → fallback global", commissionMinMinor("outros") === COMMISSION_MIN_MINOR);
check("Sem categoria → fallback global", commissionMinMinor() === COMMISSION_MIN_MINOR);
const r8 = computeCommission(toMinor(50_000), DEFAULT_SITE_RATE_BPS, DEFAULT_AGENT_SHARE_BPS, minImoveis);
check("Negócio de 50.000 Kz imóvel → min 15.000 Kz", r8.totalCommission === 1_500_000n && r8.usedMinimum === true);
check("Split do mínimo por categoria (50/50)", r8.agentAmount === 750_000n && r8.platformAmount === 750_000n);
const r9 = computeCommission(toMinor(200_000), DEFAULT_SITE_RATE_BPS, DEFAULT_AGENT_SHARE_BPS, minImoveis);
check("Negócio acima do min por categoria → % normal", r9.totalCommission === 2_000_000n && r9.usedMinimum === false);

// 8. Split custom (adiantamento recuperável / agente com 40%)
const r10 = computeCommission(toMinor(10_000_000), DEFAULT_SITE_RATE_BPS, 4000);
check("agentShareBps=4000 → 40% para o agente", r10.agentAmount === 40_000_000n);
check("agentShareBps=4000 → 60% para a plataforma", r10.platformAmount === 60_000_000n);
check("agentShareBps=4000 → soma = total", r10.agentAmount + r10.platformAmount === r10.totalCommission);

// 9. toMinor/fromMinor round-trip
const kz = 999.99;
check("round-trip toMinor/fromMinor", fromMinor(toMinor(kz)) === kz);
check("toMinor(1000) = 100000 cêntimos", toMinor(1000) === 100_000n);

// ---- Anexo B: Acordo de Negócio (dedução na fonte, com IVA) ----

// 10. Valores da tabela do Anexo B para 10.000.000 Kz
const a1 = computeAgreement(toMinor(10_000_000));
check("A10: commissionNet = 10% (1.000.000 Kz)", a1.commissionNet === 100_000_000n);
check("A10: IVA 14% sobre o líquido (140.000 Kz)", a1.commissionVat === 14_000_000n);
check("A10: buyerPayable = net + vat (1.140.000 Kz)", a1.buyerPayable === 114_000_000n);
check("A10: sellerPayable = 90% (9.000.000 Kz)", a1.sellerPayable === 900_000_000n);
check("A10: agente incide no líquido (50% de 1M = 500.000 Kz)", a1.agentAmount === 50_000_000n);
check("A10: plataforma líquida após split (500.000 Kz)", a1.platformAmount === 50_000_000n);
check("A10: invariante net + sellerPayable = agreedPrice", a1.commissionNet + a1.sellerPayable === a1.agreedPrice);
check("A10: buyerPayable = net + vat exato", a1.buyerPayable === a1.commissionNet + a1.commissionVat);

// 11. Invariante `commissionNet + sellerPayable = agreedPrice` para milhares
//     de preços aleatórios — sem cêntimos criados ou perdidos (Anexo B sec. 9 #1).
let seed = 20260910;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed;
}
let invariantOk = true;
let vatRoundedOk = true;
for (let i = 0; i < 5000; i++) {
  const price = BigInt(rnd()); // cêntimos, até ~21 milhões Kz
  for (const rate of [1000, 900, 800, 700]) {
    for (const share of [5000, 4000, 10000, 0]) {
      const a = computeAgreement(price, rate, share);
      if (a.commissionNet + a.sellerPayable !== a.agreedPrice) invariantOk = false;
      if (a.commissionNet < 0 || a.sellerPayable < 0 || a.buyerPayable < 0) invariantOk = false;
      if (a.agreedPrice !== price) invariantOk = false;
      if (a.buyerPayable !== a.commissionNet + a.commissionVat) vatRoundedOk = false;
    }
  }
}
check("AnexoB: invariante em 50.000 combinações (sem cêntimos perdidos)", invariantOk);
check("AnexoB: buyerPayable = net + vat sempre", vatRoundedOk);

// 12. Mínimo: 500 Kz negócio → min 1.000 Kz líquidos + IVA, split sobre o líquido
const a2 = computeAgreement(toMinor(500));
check("AnexoB min: net = mínimo global", a2.commissionNet === COMMISSION_MIN_MINOR && a2.usedMinimum);
check("AnexoB min: IVA sobre o mínimo", a2.commissionVat === COMMISSION_MIN_MINOR * 1400n / 10000n);
check("AnexoB min: agente sobre o líquido mínimo", a2.agentAmount === a2.commissionNet / 2n);
check("AnexoB min: seller não paga a mais", a2.sellerPayable === toMinor(500) - a2.commissionNet);

// 13. Plano reduzido (PRO 8%): agente nunca incide sobre o total com IVA
const a3 = computeAgreement(toMinor(10_000_000), 800);
check("AnexoB PRO: net 800.000 Kz", a3.commissionNet === 80_000_000n);
check("AnexoB PRO: IVA sobre o líquido", a3.commissionVat === 11_200_000n);
check("AnexoB PRO: agente sobre 800.000 (não sobre buyerPayable)", a3.agentAmount === 40_000_000n && a3.platformAmount === 40_000_000n);
check("AnexoB PRO: invariante mantém-se", a3.commissionNet + a3.sellerPayable === a3.agreedPrice);

// 14. VAT custom (0% e 30%)
const a4 = computeAgreement(toMinor(1_000_000), DEFAULT_SITE_RATE_BPS, DEFAULT_AGENT_SHARE_BPS, 0);
check("AnexoB IVA 0%: buyer = net", a4.buyerPayable === a4.commissionNet && a4.commissionVat === 0n);
const a5 = computeAgreement(toMinor(1_000_000), DEFAULT_SITE_RATE_BPS, DEFAULT_AGENT_SHARE_BPS, 3000);
check("AnexoB IVA 30%: vat sobre net", a5.commissionVat === a5.commissionNet * 3000n / 10000n);

// ---- Anexo B rev: comissão escalonada 30/70 ----

// 15. Split 30/70 sobre o buyerPayable (10.000.000 Kz, 10% + 14% IVA)
const s1 = computeAgreement(toMinor(10_000_000));
check("30/70: adesão = 30% de 1.140.000 Kz (342.000 Kz)", s1.depositAmount === 34_200_000n);
check("30/70: saldo = 70% (798.000 Kz)", s1.balanceAmount === 79_800_000n);
check("30/70: deposit + balance = buyerPayable", s1.depositAmount + s1.balanceAmount === s1.buyerPayable);
check("30/70: depositBps default 3000", s1.depositBps === 3000);

// 16. Invariante deposit+balance = buyerPayable para milhares de combinações
let splitOk = true;
for (let i = 0; i < 5000; i++) {
  const price = BigInt(rnd());
  for (const rate of [1000, 900, 800, 700]) {
    for (const depositBps of [0, 3000, 5000, 10000]) {
      const a = computeAgreement(price, rate, 5000, 1400, COMMISSION_MIN_MINOR, depositBps);
      if (a.depositAmount + a.balanceAmount !== a.buyerPayable) splitOk = false;
    }
  }
}
check("30/70: split exato em todas as combinações (sem cêntimos perdidos)", splitOk);

// 17. Adesão mínima de 1 cêntimo em negócio pequeno (não fica 0 no saldo)
const s2 = computeAgreement(toMinor(500));
check("30/70 min: adesão > 0 com mínimo aplicado", s2.depositAmount > 0n);
check("30/70 min: split mantém soma", s2.depositAmount + s2.balanceAmount === s2.buyerPayable);

// 18. depositBps custom (adesão 50%)
const s3 = computeAgreement(toMinor(10_000_000), DEFAULT_SITE_RATE_BPS, DEFAULT_AGENT_SHARE_BPS, 1400, COMMISSION_MIN_MINOR, 5000);
check("30/70 +50%: adesão = metade do buyerPayable", s3.depositAmount === s3.buyerPayable / 2n && s3.balanceAmount === s3.buyerPayable - s3.depositAmount);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);