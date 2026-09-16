// Testes das atividades da conta única (spec v3 §3) — node --experimental-strip-types test-activities.mjs
import {
  recordActivity,
  listActivities,
  activitiesSummary,
  transitionActivityStatus,
} from "./lib/activities.ts";

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  if (ok) { pass++; console.log(`PASS | ${label}`); }
  else { fail++; console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`); }
};

const T0 = new Date("2026-04-10T10:00:00.000Z");
const day = (d) => new Date(T0.getTime() + d * 86_400_000);

const makeStore = () => new (class { constructor() { this.rows = []; } save(a) { this.rows.push(a); } list(u) { return this.rows; } })();

// 1) comprar e vender na mesma conta única
const s1 = makeStore();
const aBuy = recordActivity({ userId: "u1", activityType: "BUYING", transactionId: "t1", now: day(0), store: s1 });
const aSell = recordActivity({ userId: "u1", activityType: "SELLING", transactionId: "t2", now: day(1), store: s1 });
check("comprar → BUYER", aBuy.side === "BUYER");
check("vender → SELLER", aSell.side === "SELLER");
const all = listActivities({ userId: "u1", store: s1 });
check("mesma conta com 2 atividades", all.length === 2);

// 2) contradições bloqueadas
let threw = false;
try { recordActivity({ userId: "u1", activityType: "BUYING", side: "SELLER", now: day(0), store: makeStore() }); } catch { threw = true; }
check("BUYING não pode ter side SELLER", threw);
threw = false;
try { recordActivity({ userId: "u1", activityType: "SELLING", side: "BUYER", now: day(0), store: makeStore() }); } catch { threw = true; }
check("SELLING não pode ter side BUYER", threw);

// 3) padrãos: visitar/investigar são de comprador
const s3 = makeStore();
const aVisit = recordActivity({ userId: "u1", activityType: "VISITING", now: day(0), store: s3 });
const aInv = recordActivity({ userId: "u1", activityType: "INVESTIGATING", now: day(0), store: s3 });
check("VISITING → BUYER por omissão", aVisit.side === "BUYER");
check("INVESTIGATING → BUYER por omissão", aInv.side === "BUYER");

// 4) seletor [Todas | Como comprador | Como vendedor]
const s4 = makeStore();
recordActivity({ userId: "u2", activityType: "BUYING", now: day(0), store: s4 });
recordActivity({ userId: "u2", activityType: "SELLING", now: day(1), store: s4 });
recordActivity({ userId: "u2", activityType: "VISITING", now: day(2), store: s4 });
const filter = (side) => listActivities({ userId: "u2", side, store: s4 }).length;
check("Todas → 3", filter("ALL") === 3);
check("Como comprador → 2", filter("BUYER") === 2);
check("Como vendedor → 1", filter("SELLER") === 1);
check("filtro por tipo BUYING → 1", listActivities({ userId: "u2", activityType: "BUYING", store: s4 }).length === 1);

// 5) ordenação desc + limite + paginação by before
const s5 = makeStore();
for (let i = 0; i < 5; i++) recordActivity({ userId: "u3", activityType: "BUYING", now: day(i), store: s5 });
const ordered = listActivities({ userId: "u3", store: s5 });
check("ordenação desc", ordered[0].createdAtIso > ordered[1].createdAtIso);
check("limit 2", listActivities({ userId: "u3", limit: 2, store: s5 }).length === 2);
const before = day(3);
const older = listActivities({ userId: "u3", before: before.toISOString(), store: s5 });
check("paginação exclui posteriores a before", older.every((a) => new Date(a.createdAtIso) < before) && older.length === 3);

// 6) resumo do painel
const s6 = makeStore();
recordActivity({ userId: "u4", activityType: "BUYING", now: day(0), store: s6 });
recordActivity({ userId: "u4", activityType: "SELLING", now: day(1), store: s6 });
recordActivity({ userId: "u4", activityType: "VISITING", now: day(2), store: s6 });
const sum = activitiesSummary("u4", s6);
check("resumo: total 3, comprador 2, vendedor 1", sum.total === 3 && sum.buyer === 2 && sum.seller === 1);
check("resumo por tipo", sum.byType.BUYING === 1 && sum.byType.SELLING === 1 && sum.byType.VISITING === 1);

// 7) transições de estado
const st7 = recordActivity({ userId: "u5", activityType: "BUYING", now: day(0), store: makeStore() });
const done = transitionActivityStatus(st7, "COMPLETED");
check("OPEN → COMPLETED", done.status === "COMPLETED");
threw = false;
try { transitionActivityStatus(done, "OPEN"); } catch { threw = true; }
check("COMPLETED não volta a OPEN", threw);
const cancelled = transitionActivityStatus(done, "CANCELLED");
check("COMPLETED → CANCELLED", cancelled.status === "CANCELLED");

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);