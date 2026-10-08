/**
 * Lê o PDF e gera src/data/book-manifest.json:
 *  - lista de páginas do arquivo e número impresso de cada uma;
 *  - capítulos e subseções do Sumário mapeados para as páginas REAIS do arquivo
 *    (busca pelo conteúdo, nunca assume que "número impresso = índice do arquivo").
 *
 * Uso:  npm run manifest [-- caminho/do/arquivo.pdf]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pdfPath = path.resolve(root, process.argv[2] || "public/book/guia.pdf");
const outPath = path.resolve(root, "src/data/book-manifest.json");

const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const { TOC } = await import(pathToFileURL(path.join(root, "src/data/toc.js")).href);

const norm = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
const pageCount = doc.numPages;

const pages = [];
for (let n = 1; n <= pageCount; n++) {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  const items = content.items.filter((i) => i.str && i.str.trim());
  const text = norm(items.map((i) => i.str).join(" "));
  // número impresso: item só com dígitos perto da borda inferior da página
  const [, , , h] = page.view;
  const candidates = items
    .filter((i) => /^\d{1,3}$/.test(i.str.trim()) && i.transform[5] < h * 0.12)
    .map((i) => Number(i.str.trim()));
  pages.push({ file: n, text, compact: text.replace(/[^a-z0-9]/g, ""), words: text.split(" ").length, printedDetected: candidates.length ? candidates[candidates.length - 1] : null, width: page.view[2], height: page.view[3] });
}

// Deslocamento número impresso ↔ arquivo (detectado, não presumido)
const diffs = pages.filter((p) => p.printedDetected != null).map((p) => p.file - p.printedDetected);
const offset = Number(Object.entries(diffs.reduce((a, d) => ((a[d] = (a[d] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0]);
const firstPrinted = pages.find((p) => p.printedDetected != null)?.file ?? 2;
const lastPrinted = [...pages].reverse().find((p) => p.printedDetected != null)?.file ?? pageCount - 1;

const printedOf = (file) =>
  file >= firstPrinted && file <= lastPrinted ? file - offset : null;

const compactOf = (m) => norm(m).replace(/[^a-z0-9]/g, "");
// maxWords: páginas-divisórias de capítulo têm pouquíssimo texto
const findFrom = (phrases, from, to, maxWords = Infinity) => {
  for (let n = from; n <= to; n++) {
    const pg = pages[n - 1];
    if (pg.words <= maxWords && phrases.some((m) => pg.compact.includes(compactOf(m)))) return n;
  }
  return null;
};

// O Sumário ocupa as páginas que contêm "sumario" logo no início
const summaryPage = findFrom(["sumario"], 2, 8);
let summaryLast = summaryPage;
while (summaryLast + 1 <= pageCount && pages[summaryLast].text.startsWith("escola montessori guia da familia 2027 sumario")) summaryLast++;
const searchFrom = summaryLast + 1;

const warnings = [];
const chapters = [];
let cursor = searchFrom;
for (const ch of TOC) {
  const start = findFrom(ch.match, cursor, pageCount, 40) ?? findFrom(ch.match, cursor, pageCount);
  if (!start) { warnings.push(`Capítulo ${ch.id}: início não encontrado`); continue; }
  chapters.push({ ...ch, filePage: start });
  cursor = start + 1;
}
chapters.forEach((ch, i) => {
  const end = (chapters[i + 1]?.filePage ?? pageCount + 1) - 1;
  ch.fileEnd = end;
  let subCursor = ch.filePage;
  ch.subsections = ch.subsections.map((s) => {
    const fp = findFrom(s.match, subCursor, end) ?? findFrom(s.match, ch.filePage, end);
    if (!fp) warnings.push(`Subseção "${s.title}" não encontrada`);
    subCursor = fp ?? subCursor;
    return { title: s.title, filePage: fp ?? ch.filePage, printedPage: printedOf(fp ?? ch.filePage) };
  });
  ch.printedPage = printedOf(ch.filePage);
});

const manifest = {
  generatedFrom: path.basename(pdfPath),
  pageCount,
  printedOffset: offset,
  firstPrintedFilePage: firstPrinted,
  lastPrintedFilePage: lastPrinted,
  summary: { filePage: summaryPage, lastFilePage: summaryLast },
  pageSizePt: { width: pages[0].width, height: pages[0].height },
  chapters: chapters.map(({ id, label, title, printedRef, filePage, fileEnd, printedPage, subsections }) => ({
    id, label, title, printedRef, filePage, fileEnd, printedPage, subsections,
  })),
};

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Páginas: ${pageCount} | deslocamento impresso: ${offset} | Sumário: ${summaryPage}-${summaryLast}`);
console.table(manifest.chapters.map((c) => ({ cap: c.id, arquivo: c.filePage, impresso: c.printedPage, sumarioPDF: c.printedRef, sub: c.subsections.map((s) => s.filePage).join(",") })));
if (warnings.length) { console.warn("AVISOS:\n- " + warnings.join("\n- ")); process.exitCode = 1; }
