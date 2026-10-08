import * as pdfjsLib from "pdfjs-dist/build/pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import { BOOK_SPEC } from "../../config/book.config";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MM_TO_PT = 72 / 25.4;

/**
 * Abre o PDF e renderiza regiões de página (já refiladas no TrimBox) em canvas.
 * O PDF é a fonte da verdade: nada é redesenhado, só rasterizado.
 */
export class PdfSource {
  constructor(url) {
    this.url = url;
    this.doc = null;
    this.pageCount = 0;
  }

  async open() {
    const task = pdfjsLib.getDocument({
      url: this.url,
      isEvalSupported: false,
      useSystemFonts: false,
    });
    this.doc = await task.promise;
    this.pageCount = this.doc.numPages;
    return this;
  }

  /**
   * @param {number} pageNo  página do arquivo (1-based)
   * @param {object} o
   * @param {number} o.width largura do canvas em px
   * @param {object} [o.extraMm] sangria extra além do refile {left,right,top,bottom} (máx. 3 mm)
   * @returns {Promise<HTMLCanvasElement|null>} null se cancelado
   */
  async renderPage(pageNo, { width, extraMm = {}, signal } = {}) {
    const page = await this.doc.getPage(pageNo);
    const inset = BOOK_SPEC.pdfTrimInsetPt;
    const [, , pageW, pageH] = page.view;
    const trimW = pageW - inset * 2;
    const trimH = pageH - inset * 2;
    const clampPt = (mm = 0) => Math.min(Math.max(mm, 0) * MM_TO_PT, inset);
    const eL = clampPt(extraMm.left);
    const eR = clampPt(extraMm.right);
    const eT = clampPt(extraMm.top);
    const eB = clampPt(extraMm.bottom);

    const regionW = trimW + eL + eR;
    const regionH = trimH + eT + eB;
    const canvasW = Math.max(8, Math.round(width));
    const canvasH = Math.max(8, Math.round((canvasW * regionH) / regionW));
    const scale = canvasW / regionW;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const viewport = page.getViewport({
      scale,
      offsetX: -(inset - eL) * scale,
      offsetY: -(inset - eT) * scale,
    });

    const task = page.render({ canvasContext: ctx, viewport, intent: "display" });
    const onAbort = () => task.cancel();
    signal?.addEventListener("abort", onAbort);
    try {
      await task.promise;
    } catch (e) {
      if (e?.name === "RenderingCancelledException") return null;
      throw e;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      page.cleanup(); // libera imagens decodificadas da página
    }
    return canvas;
  }

  destroy() {
    this.doc?.destroy();
    this.doc = null;
  }
}
