import { BOOK_SPEC, PDF_URL, pickQuality } from "../config/book.config";
import manifest from "../data/book-manifest.json";
import { PdfSource } from "./pdf/pdfSource";
import { TextureManager } from "./textures/TextureManager";
import { buildBookModel } from "./bookModel";

let runtime = null;

/** Capas: avanço só em cima e embaixo (mesma largura das folhas, para a curva da capa
 *  ser idêntica à das folhas e ela não atravessar o miolo). */
function regionFor(pageNo) {
  const oh = Math.min(BOOK_SPEC.coverOverhangMm, 3);
  const last = manifest.pageCount;
  if (pageNo === 1 || pageNo === last - 1) return { left: 0, right: 0, top: oh, bottom: oh }; // frente da folha (lombada à esquerda)
  if (pageNo === 2 || pageNo === last) return { left: 0, right: 0, top: oh, bottom: oh }; // verso (lombada à direita)
  return {};
}

/** Cria (uma única vez) modelo físico, fonte do PDF e gerenciador de texturas. */
export function initBook() {
  if (runtime) return runtime;
  runtime = (async () => {
    const model = buildBookModel();
    const pdf = await new PdfSource(PDF_URL).open();
    if (pdf.pageCount !== manifest.pageCount) {
      throw new Error(
        `O PDF tem ${pdf.pageCount} páginas, mas o manifesto foi gerado para ${manifest.pageCount}. Rode "npm run manifest".`
      );
    }
    const manager = new TextureManager(pdf, pickQuality(), regionFor);
    if (typeof window !== "undefined") window.__livro = { model, manager };
    return { model, manager, pdf };
  })();
  return runtime;
}
