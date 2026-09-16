// Testes da consola interna — filas de trabalho (spec v3 sec. 9).
// Correr: node --experimental-strip-types test-workqueue.mjs

import {
  createQueueItem,
  assignItem,
  setItemStatus,
  setNextStep,
  escalateItem,
  checkSla,
  requeueItem,
  workloadSummary,
  verificationToQueueItem,
  complianceToQueueItem,
  refundToQueueItem,
  SLA_MINUTES,
} from "./lib/workQueue.ts";

import { startVerification, rejectCase } from "./lib/verificationWorkflow.ts";
import { requestRefund, approveRefund, markProcessing } from "./lib/refundWorkflow.ts";

let pass = 0;
let fail = 0;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS | ${label}`);
  } else {
    fail++;
    console.log(`FAIL | ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOW = "2026-04-01T12:00:00.000Z";
const addMin = (iso, m) => new Date(new Date(iso).getTime() + m * 60_000).toISOString();

// ---- Criação / SLA ----
const item = createQueueItem({
  id: "q1",
  queue: "VERIFICATION",
  category: "anuncio.novo",
  entityType: "LISTING",
  subjectId: "l1",
  actorId: "system.workqueue",
  nowIso: NOW,
}).item;
check("criar item → NOVO com prazo = SLA(MEDIA=1d)",
  item.status === "NOVO" && item.deadlineIso === addMin(NOW, SLA_MINUTES.MEDIA)
  && item.escalateLevel === 0 && item.history.length === 1);

const alta = createQueueItem({ id: "q2", queue: "SUPPORT", category: "reclamacao", entityType: "TICKET", subjectId: "t1", priority: "ALTA", actorId: "u1", nowIso: NOW }).item;
check("ALTA → prazo 4h",
  alta.deadlineIso === addMin(NOW, SLA_MINUTES.ALTA));
check("BAIXA → prazo 3d",
  createQueueItem({ id: "q3", queue: "COMPLIANCE", category: "origem.fundos", entityType: "USER", subjectId: "u9", priority: "BAIXA", actorId: "u1", nowIso: NOW }).item.deadlineIso === addMin(NOW, SLA_MINUTES.BAIXA));
check("dueAtIso explícito sobrepõe SLA",
  createQueueItem({ id: "q4", queue: "VERIFICATION", category: "urgentes", entityType: "LISTING", subjectId: "l2", dueAtIso: "2026-04-02T00:00:00.000Z", actorId: "u1", nowIso: NOW }).item.deadlineIso === "2026-04-02T00:00:00.000Z");
check("categoria inválida → recusa",
  createQueueItem({ id: "q5", queue: "VERIFICATION", category: "lixo", entityType: "LISTING", subjectId: "l3", actorId: "u1", nowIso: NOW }).error !== undefined);

// ---- Atribuição ----
const a1 = assignItem(item, { assigneeId: "op-ver1", actorId: "supervisor", nowIso: NOW });
check("atribuir → ATRIBUIDO com responsável e histórico",
  a1.item.status === "ATRIBUIDO" && a1.item.assigneeId === "op-ver1"
  && a1.item.history.at(-1).from === "NOVO" && a1.item.history.at(-1).to === "ATRIBUIDO");
check("tentar trocar responsável → recusa",
  assignItem(a1.item, { assigneeId: "op-ver2", actorId: "supervisor" }).error !== undefined);
const done = setItemStatus(item, { to: "CONCLUIDO", actorId: "op-ver1", nowIso: NOW }).item;
check("concluído não é atribuível",
  assignItem(done, { assigneeId: "op-ver2", actorId: "supervisor", nowIso: NOW }).error !== undefined);

// ---- Transições ----
const t1 = setItemStatus(item, { to: "EM_CURSO", actorId: "op-ver1", nowIso: NOW });
check("NOVO→EM_CURSO permitida",
  t1.item.status === "EM_CURSO");
check("EM_CURSO→NOVO recusada (explica a transição)",
  setItemStatus(t1.item, { to: "NOVO", actorId: "op-ver1" }).error?.includes("não permitida") === true);
check("EM_CURSO→AGUARDANDO permitida e CONCLUIDO é terminal",
  setItemStatus(setItemStatus(t1.item, { to: "AGUARDANDO", actorId: "op-ver1", nowIso: NOW }).item, { to: "EM_CURSO", actorId: "op-ver1", nowIso: NOW }).item.status === "EM_CURSO");
const trm = setItemStatus(item, { to: "CONCLUIDO", actorId: "op-ver1", nowIso: NOW }).item;
check("estado igual → recusa",
  setItemStatus(item, { to: "NOVO", actorId: "op-ver1", nowIso: NOW }).error !== undefined
  && setItemStatus(trm, { to: "EM_CURSO", actorId: "op-ver1", nowIso: NOW }).error !== undefined);
check("mesmo estado → recusa",
  setItemStatus(item, { to: "NOVO", actorId: "op-ver1", nowIso: NOW }).error !== undefined);

// ---- Próximo passo / escalamento ----
check("setNextStep define e trima",
  setNextStep(item, "  Pedir procuração original.  ").item.nextStep === "Pedir procuração original.");
check("setNextStep vazio → recusa",
  setNextStep(item, "   ").error !== undefined);
const esc = escalateItem(item, { actorId: "supervisor", reason: "Sem resposta do vendedor há 3 dias.", nowIso: NOW });
check("escalar → nível 1, ALTA, novo prazo 4h, porquê registado",
  esc.item.escalateLevel === 1 && esc.item.priority === "ALTA"
  && esc.item.deadlineIso === addMin(NOW, SLA_MINUTES.ALTA)
  && esc.item.history.at(-1).note?.includes("ESCALADO"));
check("escalar sem motivo → recusa",
  escalateItem(item, { actorId: "supervisor", reason: "  " }).error !== undefined);
const esc2 = escalateItem(esc.item, { actorId: "supervisor", reason: "Compliance não respondeu.", nowIso: NOW });
check("segunda subida mantém nível máximo 2",
  esc2.item.escalateLevel === 2);
check("concluído não escala",
  escalateItem(trm, { actorId: "supervisor", reason: "x", nowIso: NOW }).error !== undefined);

// ---- SLA ----
check("antes do prazo → não ultrapassado",
  checkSla(item, addMin(NOW, SLA_MINUTES.MEDIA - 1)).overdue === false);
const lat = checkSla(item, addMin(NOW, SLA_MINUTES.MEDIA + 1));
check("depois do prazo → ultrapassado com motivo",
  lat.overdue === true && lat.reason?.includes("Prazo"));
check("concluído não conta como em atraso",
  checkSla(trm, "2030-01-01T00:00:00.000Z").overdue === false);

// ---- Requeue entre filas ----
const rq = requeueItem(item, { queue: "COMPLIANCE", category: "risco.elevado", actorId: "op-ver1", note: "Ameaça de fraude.", nowIso: NOW });
check("requeue → COMPLIANCE/AGUARDANDO e liberta responsável",
  rq.item.queue === "COMPLIANCE" && rq.item.status === "AGUARDANDO"
  && rq.item.category === "risco.elevado" && rq.item.assigneeId === undefined
  && rq.item.history.at(-1).note?.includes("REQUEUE"));
check("requeue para categoria inexistente → recusa",
  requeueItem(item, { queue: "FINANCIAL", category: "lixo", actorId: "op-1", nowIso: NOW }).error !== undefined);
check("concluído não requeua",
  requeueItem(trm, { queue: "SUPPORT", category: "reclamacao", actorId: "op-1", nowIso: NOW }).error !== undefined);

// ---- Resumo (painel) ----
const s = workloadSummary([
  { ...item, status: "EM_CURSO" },
  { ...item, id: "x2", queue: "FINANCIAL", category: "reembolso.aprovacao", priority: "ALTA", status: "NOVO" },
  { ...item, id: "x3", queue: "VERIFICATION", category: "anuncio.novo", status: "CONCLUIDO" },
]);
check("resumo por fila/prioridade (exclui concluídos)",
  s.VERIFICATION.MEDIA === 1 && s.FINANCIAL.ALTA === 1 && s.VERIFICATION.BAIXA === 0);

// ---- Adaptadores dos motores ----
const pedro = { fullName: "José Manuel dos Santos", nif: "541720983", province: "Luanda", isCompany: false };
const bi = { docId: "d1", type: "bi", sha256: "aaa", holderName: "José Manuel dos Santos", nif: "541720983" };
const title = { docId: "d2", type: "title_deed", sha256: "bbb", holderName: "José Manuel dos Santos" };
const procura = { docId: "d3", type: "procura", sha256: "ccc", holderName: "José Manuel dos Santos" };

const falta = startVerification({ id: "v1", subjectType: "LISTING", subjectId: "l1", category: "IMOVEL", submittedBy: "u9", actorRole: "SELLER", subjectData: pedro, documents: [bi, title], nowIso: NOW }).ver;
check("verificação com docs em falta → fila VERIFICATION docs.pendentes MEDIA",
  verificationToQueueItem(falta, NOW, "w1").item?.category === "docs.pendentes"
  && verificationToQueueItem(falta, NOW, "w1").item?.priority === "MEDIA");

const riscoAlto = startVerification({ id: "v2", subjectType: "SELLER", subjectId: "u-hr", category: "IMOVEL", submittedBy: "u-hr", actorRole: "SELLER", subjectData: pedro, documents: [bi, title, procura], risk: { thirdPartyPayer: true, pepHit: true }, nowIso: NOW }).ver;
check("risco alto → fila urgentes ALTA",
  verificationToQueueItem(riscoAlto, NOW, "w2").item?.category === "urgentes"
  && verificationToQueueItem(riscoAlto, NOW, "w2").item?.priority === "ALTA");
check("compliance: risco alto multi-razão → risco.elevado",
  complianceToQueueItem(riscoAlto, NOW, "w3").item?.category === "risco.elevado"
  && complianceToQueueItem(riscoAlto, NOW, "w3").item?.queue === "COMPLIANCE");

const empresa = startVerification({ id: "v3", subjectType: "SELLER", subjectId: "u-emp", category: "IMOVEL", submittedBy: "u-emp", actorRole: "SELLER", subjectData: { fullName: "Santos, Lda", isCompany: true, sharesBreakdown: [{ name: "A", pct: 50 }, { name: "B", pct: 50 }], sourceOfFundsDeclared: false }, documents: [bi, title, procura], nowIso: NOW }).ver;
check("sociedade sem origem de fundos → beneficiario.efetivo",
  complianceToQueueItem(empresa, NOW, "w4").item?.category === "beneficiario.efetivo");

check("sem risco alto → compliance não gera item",
  complianceToQueueItem(falta, NOW, "w5").item === undefined);
const rejeitada = rejectCase([] .concat(falta), { byId: "op-ver1", byRole: "VERIFICADOR", reason: "Título com ónus não declarado.", nowIso: NOW });
check("verificação REJECTED → sem item na fila",
  verificationToQueueItem(rejeitada.ver, NOW, "w5b").item === undefined);

// ---- Reembolso → fila FINANCIAL ----
const pequeno = requestRefund({ id: "r1", dealId: "d1", requesterId: "op-fin1", requesterRole: "FINANCEIRO", amountCents: 5_000_000n, reason: "Desistiu do negócio.", nowIso: NOW }).refund;
check("reembolso pequeno → reembolso.aprovacao MEDIA",
  refundToQueueItem(pequeno, NOW, "w6").item?.category === "reembolso.aprovacao"
  && refundToQueueItem(pequeno, NOW, "w6").item?.priority === "MEDIA");

const grande = requestRefund({ id: "r2", dealId: "d2", requesterId: "op-fin1", requesterRole: "FINANCEIRO", amountCents: 100_000_000n, reason: "Cancelamento.", nowIso: NOW }).refund;
check("reembolso ≥ 1.000.000 AOA → ALTA (dupla aprovação)",
  refundToQueueItem(grande, NOW, "w7").item?.priority === "ALTA");

const processando = markProcessing(approveRefund(pequeno, { approverId: "op-sup1", approverRole: "SUPERVISOR", nowIso: NOW }).refund, { operatorId: "op-fin1", operatorRole: "FINANCEIRO", method: "transferencia_bancaria", nowIso: NOW });
check("em processamento → reembolso.execucao ALTA",
  refundToQueueItem(processando.refund, NOW, "w8").item?.category === "reembolso.execucao"
  && refundToQueueItem(processando.refund, NOW, "w8").item?.priority === "ALTA");

check("reembolso além do prazo → ALTA",
  refundToQueueItem(pequeno, "2026-04-20T00:00:00.000Z", "w9").item?.priority === "ALTA");
check("reembolsado → sem item na fila",
  refundToQueueItem({ ...processando.refund, status: "REEMBOLSADO" }, NOW, "w10").item === undefined);

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);