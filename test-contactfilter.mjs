import { findContacts, containsContact, sanitizeContacts } from "./lib/contactFilter.ts";

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS |", name); }
  else { fail++; console.log("FAIL |", name, detail ?? ""); }
}

// Bateria do v2 (sec. 13 "Filtro de contactos")
check("Telefone +244 923 456 789", containsContact("Liga +244 923 456 789 amanhã"));
check("Telefone 923456789", containsContact("Liga 923456789"));
check("Telefone com espaços 9 1 2 3 4 5 6 7 8", containsContact("9 1 2 3 4 5 6 7 8"));
check("Telefone com hífens 912-345-678", containsContact("912-345-678"));
check("Telefone com 00244", containsContact("00244 923 456 789"));
check("Não-móvel: 222 334 455 (fixo Luanda)", containsContact("Tel: 222 334 455"));

check("Email normal", containsContact("fale com joao@mail.com na hora"));
check("Email ofuscado joao(at)mail.com", containsContact("joao(at)mail.com"));
check("Email com ponto e +", containsContact("teste+fab@empresa.co.ao"));
check("@handle", containsContact("segue @joao_vendedor no insta"));
check("WhatsApp wa.me", containsContact("me chama no wa.me/923456789"));
check("WhatsApp chat.whatsapp.com", containsContact("chat.whatsapp.com/AbCd123 x"));
check("Telegram t.me", containsContact("t.me/joao"));
check("Números por extenso (nove um dois tres)", containsContact("nove um dois tres quatro cinco seis sete oito"));

// Texto limpo não dispara
check("Texto normal sem contactos", !containsContact("Olá, gostaria de saber o preço do veículo"));
check("Preço em número não dispara", !containsContact("O valor é 15.000.000 Kz, negociável"));
check("Data não dispara", !containsContact("Disponível a partir de 11/09/2026"));
check("Palavras soltas com dígito word", !containsContact("isto e um teste de dois"));
check("Dois dígitos por extenso (abaixo de 3)", !containsContact("faz um dois passos"));
check("Email de domínio falso sem TLD", !containsContact("ola@servidor"));

// findContacts — tipos corretos e ordem (mais específico primeiro)
const mixed = "Liga 923456789 ou joao@mail.com, wa.me/9134578";
const ms = findContacts(mixed);
check("Encontra 3 contactos distintos", ms.length === 3,
  `got ${JSON.stringify(ms.map((m) => m.type))}`);
check("Ordem por posição", ms[0].type === "phone" && ms[1].type === "email" && ms[2].type === "link");

check("Link absorve telefone dentro dele (1 match)", findContacts("wa.me/9134578").length === 1);

// sanitizeContacts
const s1 = sanitizeContacts("Liga 923456789 ou joao@mail.com");
check("sanitize: esconde telefone e email", !s1.includes("923456789") && !s1.includes("joao@mail.com"));
check("sanitize: placeholders presentes", s1.includes("[telefone oculto]") && s1.includes("[contacto oculto]"));
check("sanitize: texto intacto fora dos contactos", s1.startsWith("Liga ") && s1.endsWith(""));
check("sanitize: texto limpo não alterado", sanitizeContacts("Preço 15.000.000 Kz") === "Preço 15.000.000 Kz");
const s2 = sanitizeContacts("nove um dois tres quatro cinco seis sete oito");
check("sanitize: dígitos por extenso", s2.includes("[numero oculto]"));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);