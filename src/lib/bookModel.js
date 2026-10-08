import manifest from "../data/book-manifest.json";
import { BOOK_SPEC, MM } from "../config/book.config";

/**
 * Modelo lógico + físico do livro.
 *
 * Folha (leaf) n: frente = página do arquivo 2n+1, verso = 2n+2 (1-based).
 *   - folha 0  = capa (frente = Capa, verso = 2ª capa, impressa na página 2 do PDF)
 *   - folha N-1 = contracapa (frente = 3ª capa, verso = Contracapa)
 * Posição "p" (0..N) = quantas folhas já foram viradas para a esquerda.
 *   página esquerda visível = 2p (se p ≥ 1), direita = 2p+1 (se p < N).
 */
const mm = (v) => v * MM * 1; // mm → unidades do mundo

export function buildBookModel() {
  const pageCount = manifest.pageCount;
  if (pageCount % 2 !== 0) {
    throw new Error(`O PDF precisa ter número par de páginas (tem ${pageCount}).`);
  }
  const N = pageCount / 2;
  const scale = BOOK_SPEC.thicknessScale;
  const paper = mm(BOOK_SPEC.paperCaliperMm) * scale;
  const cover = mm(BOOK_SPEC.coverCaliperMm) * scale;
  const overhang = mm(Math.min(BOOK_SPEC.coverOverhangMm, 3));

  const thickness = Array.from({ length: N }, (_, n) => (n === 0 || n === N - 1 ? cover : paper));
  const total = thickness.reduce((a, b) => a + b, 0);

  // prefix[k] = soma das espessuras das folhas 0..k-1
  const prefix = [0];
  thickness.forEach((t) => prefix.push(prefix[prefix.length - 1] + t));

  const leaves = thickness.map((t, n) => ({
    index: n,
    frontPage: 2 * n + 1,
    backPage: 2 * n + 2,
    isCover: n === 0 || n === N - 1,
    thickness: t,
  }));

  const width = mm(BOOK_SPEC.trimMm.width);
  const height = mm(BOOK_SPEC.trimMm.height);

  return {
    pageCount,
    leafCount: N,
    leaves,
    prefix,
    thickness: total,
    width,
    height,
    overhang,
    spineWidth: mm(BOOK_SPEC.spineWrapMm),
    paperThickness: paper,
    coverThickness: cover,
  };
}

/**
 * Altura (z) do centro da folha n quando o livro está na posição p.
 * As faces superiores das duas pilhas ficam alinhadas em z = 0 (junto à lombada) e
 * as folhas "descem" para trás, como no projeto original.
 */
export function leafZ(model, n, p) {
  const P = model.prefix;
  const t = model.leaves[n].thickness;
  return n >= p ? -(P[n] - P[p] + t / 2) : -(P[p] - P[n + 1] + t / 2);
}

/* ---------- Navegação / rótulos ---------- */

/** Posição (0..N) em que a página `filePage` do arquivo fica visível. */
export function positionForFilePage(filePage) {
  return Math.floor(filePage / 2);
}

export function printedNumber(filePage) {
  if (filePage < manifest.firstPrintedFilePage || filePage > manifest.lastPrintedFilePage) return null;
  return filePage - manifest.printedOffset;
}

export const TOTAL_PRINTED = manifest.lastPrintedFilePage - manifest.printedOffset;

/** Texto "Páginas 14–15 de 84", "Capa" ou "Contracapa". */
export function pageIndicatorLabel(p) {
  const N = manifest.pageCount / 2;
  if (p <= 0) return { primary: "Capa", secondary: null };
  if (p >= N) return { primary: "Contracapa", secondary: null };
  const left = printedNumber(2 * p);
  const right = printedNumber(2 * p + 1);
  if (left && right) return { primary: `Páginas ${left}–${right}`, secondary: `de ${TOTAL_PRINTED}` };
  return { primary: `Página ${left ?? right}`, secondary: `de ${TOTAL_PRINTED}` };
}

/** Capítulo ativo para a posição p (null = abertura). */
export function chapterForPosition(p) {
  const N = manifest.pageCount / 2;
  if (p <= 0) return { kind: "cover" };
  if (p >= N) return { kind: "back" };
  const ref = Math.min(2 * p + 1, manifest.pageCount); // página direita
  const chapters = manifest.chapters;
  let found = null;
  for (const ch of chapters) if (ch.filePage <= ref) found = ch;
  if (!found) {
    const s = manifest.summary;
    return ref >= s.filePage && 2 * p <= s.lastFilePage + 1
      ? { kind: "summary" }
      : { kind: "intro" };
  }
  return { kind: "chapter", chapter: found };
}

export function navItems() {
  const N = manifest.pageCount / 2;
  return [
    { id: "capa", label: "CAPA", aria: "Ir para a capa", position: 0 },
    {
      id: "sumario",
      label: "SUMÁRIO",
      aria: "Ir para o Sumário do guia",
      position: positionForFilePage(manifest.summary.filePage),
    },
    ...manifest.chapters.map((c) => ({
      id: `cap-${c.id}`,
      chapterId: c.id,
      label: `${c.id} ${c.label}`,
      aria: `Ir para o capítulo ${c.id}: ${c.title}`,
      position: positionForFilePage(c.filePage),
    })),
    { id: "contracapa", label: "CONTRACAPA", aria: "Ir para a contracapa", position: N },
  ];
}

export function isActiveNav(item, p) {
  const ch = chapterForPosition(p);
  if (item.id === "capa") return ch.kind === "cover";
  if (item.id === "contracapa") return ch.kind === "back";
  if (item.id === "sumario") return ch.kind === "summary";
  if (item.chapterId) return ch.kind === "chapter" && ch.chapter.id === item.chapterId;
  return false;
}
