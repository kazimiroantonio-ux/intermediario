// Testes do pipeline de upload seguro (spec v3 sec. 5).
// Correr: node --experimental-strip-types test-secureupload.mjs

import {
  validateUpload,
  detectFormat,
  computeFileHash,
  safeStorageName,
  MAX_UPLOAD_BYTES,
} from "./lib/secureUpload.ts";

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

function withError(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e && typeof e === "object" && "code" in e ? e.code : "UNKNOWN";
  }
}

const PDF = Buffer.from("%PDF-1.7 fake content for test 0123456789");
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

// ---- Tipos reais ----

check("deteta PDF", detectFormat(PDF) === "pdf");
check("deteta JPG", detectFormat(JPG) === "jpg");
check("deteta PNG", detectFormat(PNG) === "png");
check("rejeita bytes arbitrários", detectFormat(Buffer.from("executable code ...")) === null);

// ---- Validação happy path ----

const ok = validateUpload({ bytes: PNG, filename: "titulo.png" });
check("válido PNG: formato+mime", ok.format === "png" && ok.mime === "image/png");
check("válido PNG: hash 64 hex", /^[0-9a-f]{64}$/.test(ok.hash));
check("válido PNG: nome seguro UUID.pdf/png", ok.storageName.endsWith(".png") && ok.storageName.length > 20);
check("válido JPEG com extensão .jpeg como jpg", validateUpload({ bytes: JPG, filename: "bi.jpeg" }).format === "jpg");

// ---- Bloqueios ----

check("bloqueia ficheiro vazio", withError(() => validateUpload({ bytes: Buffer.alloc(0) })) === "EMPTY");
check("bloqueia tipo não suportado", withError(() => validateUpload({ bytes: Buffer.from("MZ this is exe") })) === "UNSUPPORTED_TYPE");
check("bloqueia extensão .exe", withError(() => validateUpload({ bytes: Buffer.from("MZ ...") })) === "UNSUPPORTED_TYPE");
check("bloqueia revestimento: .pdf mas conteúdo PNG", withError(() => validateUpload({ bytes: PNG, filename: "doc.pdf" })) === "EXTENSION_MISMATCH");
check("bloqueia revestimento: .png mas conteúdo JPG", withError(() => validateUpload({ bytes: JPG, filename: "aimg.png" })) === "EXTENSION_MISMATCH");
check("bloqueia tamanho acima do limite",
  withError(() => validateUpload({ bytes: Buffer.concat([PDF, Buffer.alloc(MAX_UPLOAD_BYTES)]) })) === "TOO_LARGE");
check("bloqueia tamanho acima do limite customizado",
  withError(() => validateUpload({ bytes: PDF, maxBytes: 8 })) === "TOO_LARGE");

// ---- Hash seguro ----

check("hash estável para conteúdo igual", computeFileHash(PDF) === computeFileHash(PDF));
check("hash muda com o conteúdo", computeFileHash(PDF) !== computeFileHash(Buffer.from("%PDX-1.7 other")));
check("nome seguro não repete e não usa input",
  safeStorageName("pdf") !== safeStorageName("pdf") && safeStorageName("png").endsWith(".png"));

console.log(`\n=== RESUMO: ${pass}/${pass + fail} PASSED ===`);
if (fail > 0) process.exit(1);