import manifest from "../data/book-manifest.json";
import { positionForFilePage, printedNumber, TOTAL_PRINTED } from "./bookModel";

/** Normaliza 1 caractere por vez (sem acento, minúsculo) — mantém os índices alinhados ao texto. */
function normalizeAligned(text) {
  let out = "";
  for (const ch of text) {
    const n = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    out += n.length ? n[0] : ch;
  }
  return out;
}
export const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function pageLabel(filePage) {
  if (filePage === 1) return "Capa";
  if (filePage === manifest.pageCount) return "Contracapa";
  const n = printedNumber(filePage);
  return n ? `p. ${n}` : "";
}

let indexPromise = null;

/** Extrai o texto de todas as páginas do PDF (uma vez, sob demanda). O PDF é a fonte. */
export function getSearchIndex(pdf) {
  if (!indexPromise) {
    indexPromise = (async () => {
      const pages = [];
      for (let n = 1; n <= pdf.pageCount; n++) {
        const page = await pdf.doc.getPage(n);
        const tc = await page.getTextContent();
        const text = tc.items
          .map((it) => it.str + (it.hasEOL ? " " : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        pages.push({ filePage: n, text, norm: normalizeAligned(text) });
        page.cleanup();
      }
      return pages;
    })().catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

/**
 * Busca por número de página, capítulo/seção (sumário) e palavras no texto.
 * Resultado: { kind, title, detail?, snippet?, filePage, position }
 */
export function search(query, pages) {
  const raw = query.trim();
  if (!raw) return [];
  const q = normalize(raw);
  const results = [];

  // 1) número de página impresso ("23", "p 23", "pág. 23", "página 23")
  const m = q.match(/^(?:p|pag|pagina)?\.?\s*(\d{1,3})$/);
  if (m) {
    const n = +m[1];
    if (n >= 1 && n <= TOTAL_PRINTED) {
      const filePage = n + manifest.printedOffset;
      results.push({ kind: "page", title: `Ir para a página ${n}`, filePage, position: positionForFilePage(filePage) });
    }
  }

  // 2) capítulos e seções
  for (const ch of manifest.chapters) {
    if (normalize(`${ch.id} ${ch.title} ${ch.label}`).includes(q)) {
      results.push({ kind: "chapter", title: `${ch.id} · ${ch.title}`, filePage: ch.filePage, position: positionForFilePage(ch.filePage) });
    }
    for (const s of ch.subsections) {
      if (normalize(s.title).includes(q)) {
        results.push({ kind: "section", title: s.title, detail: `Capítulo ${ch.id}`, filePage: s.filePage, position: positionForFilePage(s.filePage) });
      }
    }
  }

  // 3) palavras no texto das páginas
  if (pages && q.length >= 2) {
    for (const p of pages) {
      const idx = p.norm.indexOf(q);
      if (idx < 0) continue;
      let count = 0;
      for (let i = idx; i >= 0; i = p.norm.indexOf(q, i + q.length)) count++;
      const start = Math.max(0, idx - 38);
      const end = Math.min(p.text.length, idx + q.length + 52);
      results.push({
        kind: "text",
        title: pageLabel(p.filePage),
        detail: count > 1 ? `${count} ocorrências` : null,
        snippet: {
          before: (start > 0 ? "…" : "") + p.text.slice(start, idx),
          match: p.text.slice(idx, idx + q.length),
          after: p.text.slice(idx + q.length, end) + (end < p.text.length ? "…" : ""),
        },
        filePage: p.filePage,
        position: positionForFilePage(p.filePage),
      });
      if (results.length > 60) break;
    }
  }
  return results;
}
