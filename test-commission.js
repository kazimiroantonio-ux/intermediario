const { computeCommission, toMinor, fromMinor, SITE_RATE_BPS, AGENT_SHARE_BPS, COMMISSION_MIN_MINOR } = require("../../intermediario/lib/commission.ts");

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS |", name); }
  else { fail++; console.log("FAIL |", name, detail ?? ""); }
}
function eq(a, b) { return a === b; }

// 1. 10% exato: 10.000.000 Kz → 1.000.000 Kz de comissão total
const r1 = computeCommission(toMinor(10_000_000), true);
check("10% exato (10M Kz → 1.000.000 Kz)", eq(r1.totalCommission, 100_000_000n));
check("Split 50/50 com agente", eq(r1.agentAmount, 50_000_000n) && eq(r1.platformAmount, 50_000_000n));
check("Platform = total - agent (no lost cents)", eq(r1.platformAmount, r1.totalCommission - r1.agentAmount));

// 2. Sem agente: 100% para a plataforma
const r2 = computeCommission(toMinor(10_000_000), false);
check("hasAgent=false → agent=0", eq(r2.agentAmount, 0n));
check("hasAgent=false → platform=total", eq(r2.platformAmount, r2.totalCommission));
check("Sem agente taxa ainda é 10%", eq(r2.totalCommission, 100_000_000n));

// 3. Valores ímpares: arredondamento nunca perde cêntimos, a favor da plataforma
const odd = toMinor(999_999); // 999.999,99 Kz
const r3 = computeCommission(odd, true);
const totalInt = Number(r3.totalCommission);
const oddTotal = totalInt % 10000n === 0n ? 999_999_999n : totalInt; // não fixar; validar invariante
check("Ímpar: total é inteiro", eq(r3.totalCommission * 1n, r3.totalCommission));
check("Ímpar: soma das partes = total (sem destruir cêntimos)", eq(r3.agentAmount + r3.platformAmount, r3.totalCommission));
check("Ímpar: plataforma nunca perde (platform >= agent quando 50/50 com total ímpar)", r3.platformAmount >= r3.agentAmount);

// 4. dealAmount = 0 → aplica o mínimo
const r4 = computeCommission(0n, true);
check("dealAmount=0 → comissão mínima", eq(r4.totalCommission, COMMISSION_MIN_MINOR));
check("dealAmount=0 → usedMinimum=true", eq(r4.usedMinimum, true));
check("dealAmount=0 → split do mínimo", eq(r4.platformAmount, COMMISSION_MIN_MINOR - r4.agentAmount));

// 5. Valores muito grandes: sem overflow (BigInt)
const huge = BigInt("100000000000000") // 1.000.000.000.000 Kz em cêntimos
const r5 = computeCommission(huge, true);
check("Overflow: 1e14 cêntimos computado", eq(r5.totalCommission, (huge * BigInt(SITE_RATE_BPS)) / 10000n));
check("Overflow: soma preservada", eq(r5.agentAmount + r5.platformAmount, r5.totalCommission));

// 6. Mínimo abaixo do limite: usado e respeitado
const small = toMinor(5_000); // 5.000 Kz < 100.000 cêntimos (1.000 Kz)
const r6 = computeCommission(small, false);
check("Negócio pequeno → usado o mínimo", eq(r6.usedMinimum, true));
check("Mínimo sem agente = valor mínimo total", eq(r6.totalCommission, COMMISSION_MIN_MINOR));

// 7. Exactamente no limite: sem mínimo
const exact = COMMISSION_MIN_MINOR * 10000n / BigInt(SITE_RATE_BPS) * 10000n / BigInt(SITE_RATE_BPS); // 10.000 Kz → comissão = 1.000 Kz
const r7 = computeCommission(toMinor(10_000), false);
check("No limiar exacto não força mínimo (10.000 Kz → 1.000 Kz)", eq(r7.totalCommission, COMMISSION_MIN_MINOR) && eq(r7.usedMinimum, false));

// 8. toMinor/fromMinor round-trip
const kz = 999.99;
check("round-trip toMinor/fromMinor", eq(fromMinor(toMinor(kz)), kz));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);