import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import { TEXTURE_WINDOW } from "../../config/book.config";

const RANK = { none: 0, thumb: 1, mid: 2, hi: 3, ultra: 4 };

/**
 * Gerencia as texturas das páginas:
 *  - "ultra" só as páginas visíveis, quando o livro é visto de perto (modo leitura / livro fechado)
 *  - "hi"    páginas visíveis e vizinhas (alta resolução, com mipmaps)
 *  - "mid"   páginas próximas (resolução média)
 *  - "thumb" todas as demais (miniatura barata, nunca descartada)
 * Renderiza sob demanda (fila com prioridade), nunca duplica uma textura,
 * descarta (dispose) o que sai da janela e limita o custo de upload por quadro.
 *
 * Mapeamento: posição p → páginas visíveis do arquivo = 2p e 2p+1 (1-based).
 */
export class TextureManager {
  /**
   * @param {import('../pdf/pdfSource').PdfSource} pdf
   * @param {{hi:number, mid:number, thumb:number, maxAnisotropy:number}} quality
   * @param {(pageNo:number, tier:string)=>object} regionFor  parâmetros extras por página/camada
   */
  constructor(pdf, quality, regionFor = () => ({})) {
    this.pdf = pdf;
    this.quality = quality;
    this.regionFor = regionFor;
    this.pageCount = pdf.pageCount;
    this.entries = new Map(); // page → {tier, texture, loading, desired}
    this.listeners = new Map(); // page → Set<fn>
    this.readyQueue = []; // texturas prontas aguardando o "flush" (upload controlado)
    this.running = new Map(); // key → {abort}
    this.focus = 0;
    this.ultraOn = false;
    this.downgradeTimer = null;
    this.eventListeners = new Set();
    this.disposed = false;
    this.maxAnisotropy = quality.maxAnisotropy;
    this.stats = { hiLoaded: 0, midLoaded: 0, thumbLoaded: 0, rendered: 0, disposed: 0 };
    for (let n = 1; n <= this.pageCount; n++) {
      this.entries.set(n, { tier: "none", texture: null, loading: null, desired: "thumb" });
    }
  }

  setMaxAnisotropy(v) {
    this.maxAnisotropy = Math.min(v, this.quality.maxAnisotropy);
  }

  on(fn) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }
  emit(evt) {
    this.eventListeners.forEach((fn) => fn(evt));
  }

  /** Assina mudanças de textura de uma página. Retorna função de cancelamento. */
  subscribe(page, fn) {
    if (!this.listeners.has(page)) this.listeners.set(page, new Set());
    this.listeners.get(page).add(fn);
    const e = this.entries.get(page);
    if (e?.texture) fn(e.texture, e.tier);
    return () => this.listeners.get(page)?.delete(fn);
  }

  /** Define o foco (posição p do livro) e recalcula as camadas desejadas. */
  setFocus(p) {
    this.focus = p;
    const centerLeft = 2 * p; // página esquerda visível
    const centerRight = 2 * p + 1;
    const { hiRadiusPages, midRadiusPages } = TEXTURE_WINDOW;
    for (let n = 1; n <= this.pageCount; n++) {
      const d = n <= centerLeft ? centerLeft - n : n - centerRight;
      const e = this.entries.get(n);
      e.distance = Math.max(0, d);
      e.visible = n === centerLeft || n === centerRight;
      e.desired = d <= hiRadiusPages ? "hi" : d <= midRadiusPages ? "mid" : "thumb";
      if (e.visible && this.ultraOn && this.quality.ultra) e.desired = "ultra";
    }
    // Capa e contracapa (faces externas) aparecem de qualquer ângulo — inclusive girando o livro
    // fechado ou olhando por baixo do livro aberto. Ficam sempre em alta; com o livro fechado, no máximo.
    const closed = p <= 0 || p >= this.pageCount / 2;
    for (const n of [1, this.pageCount]) {
      const e = this.entries.get(n);
      if (RANK[e.desired] < RANK.hi) e.desired = "hi";
      if (closed && this.ultraOn && this.quality.ultra) {
        e.desired = "ultra";
        e.visible = true;
      }
    }
    this.pump();
    clearTimeout(this.downgradeTimer);
    // descarta o que saiu da janela só depois de o foco ficar estável
    this.downgradeTimer = setTimeout(() => this.downgrade(), 1200);
  }

  /** Liga/desliga a resolução máxima para as páginas visíveis. */
  setUltra(on) {
    if (this.ultraOn === on) return;
    this.ultraOn = on;
    this.setFocus(this.focus);
  }

  /** Páginas visíveis do foco já têm textura boa (mid ou hi)? */
  isFocusReady() {
    const p = this.focus;
    const pages = [2 * p, 2 * p + 1].filter((n) => n >= 1 && n <= this.pageCount);
    return pages.every((n) => RANK[this.entries.get(n).tier] >= RANK.mid);
  }

  priorityOf(e, tier) {
    if (tier === "ultra") return 500 + e.distance; // depois da "hi" visível (que aparece mais rápido)
    if (tier === "thumb") return 3000 + e.distance;
    if (tier === "mid") return 2000 + e.distance;
    return (e.visible ? 0 : 1000) + e.distance; // hi
  }

  pump() {
    if (this.disposed) return;
    const jobs = [];
    this.entries.forEach((e, n) => {
      // "ultra" passa antes pela "hi" (aparece rápido e depois fica nítida)
      const want = e.desired === "ultra" && RANK[e.tier] < RANK.hi ? "hi" : e.desired;
      if (RANK[want] > RANK[e.tier] && RANK[want] > RANK[e.loading || "none"]) {
        jobs.push({ n, e, tier: want, pri: this.priorityOf(e, want) });
      }
      // se algo já carregando não é mais desejado, cancela
      if (e.loading && RANK[e.loading] > RANK[e.desired] && RANK[e.loading] > RANK[e.tier]) {
        this.running.get(`${n}`)?.abort.abort();
      }
    });
    jobs.sort((a, b) => a.pri - b.pri);
    for (const j of jobs) {
      if (this.running.size >= TEXTURE_WINDOW.maxConcurrentRenders) break;
      if (this.running.has(`${j.n}`)) continue;
      this.start(j.n, j.e, j.tier);
    }
  }

  async start(n, e, tier) {
    const abort = new AbortController();
    this.running.set(`${n}`, { abort });
    e.loading = tier;
    try {
      const canvas = await this.pdf.renderPage(n, {
        width: this.quality[tier],
        extraMm: this.regionFor(n, tier),
        signal: abort.signal,
      });
      this.stats.rendered++;
      if (!canvas || this.disposed) return;
      // ainda é útil?
      if (RANK[e.desired] < RANK[tier] && RANK[e.tier] >= RANK[e.desired]) return;
      this.readyQueue.push({ n, tier, canvas });
    } catch (err) {
      console.warn(`[livro] falha ao renderizar a página ${n}`, err);
      this.emit({ type: "error", page: n, error: err });
    } finally {
      e.loading = null;
      this.running.delete(`${n}`);
      this.pump();
    }
  }

  makeTexture(canvas, tier) {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    const mip = tier !== "thumb";
    t.generateMipmaps = mip;
    t.minFilter = mip ? LinearMipmapLinearFilter : LinearFilter;
    t.magFilter = LinearFilter;
    t.anisotropy = tier === "hi" || tier === "ultra" ? this.maxAnisotropy : 1;
    // após o upload para a GPU a cópia em CPU não é mais necessária
    t.onUpdate = () => {
      canvas.width = 1;
      canvas.height = 1;
      t.onUpdate = null;
    };
    return t;
  }

  /** Chamado a cada quadro: entrega texturas prontas respeitando um orçamento de upload. */
  flush(pixelBudget = 2.4e6) {
    let spent = 0;
    while (this.readyQueue.length && spent < pixelBudget) {
      // visíveis/hi primeiro
      this.readyQueue.sort((a, b) => this.priorityOf(this.entries.get(a.n), a.tier) - this.priorityOf(this.entries.get(b.n), b.tier));
      const item = this.readyQueue.shift();
      const e = this.entries.get(item.n);
      if (RANK[item.tier] <= RANK[e.tier]) {
        item.canvas.width = item.canvas.height = 1;
        continue;
      }
      spent += item.canvas.width * item.canvas.height;
      const texture = this.makeTexture(item.canvas, item.tier);
      const old = e.texture;
      e.texture = texture;
      e.tier = item.tier;
      this.stats[`${item.tier}Loaded`]++;
      this.listeners.get(item.n)?.forEach((fn) => fn(texture, item.tier));
      if (old) {
        old.dispose();
        this.stats.disposed++;
      }
      this.emit({ type: "texture", page: item.n, tier: item.tier });
      if (this.isFocusReady()) this.emit({ type: "focus-ready" });
    }
  }

  /** Rebaixa/descarta texturas que saíram da janela (libera memória da GPU). */
  downgrade() {
    this.entries.forEach((e, n) => {
      if (RANK[e.tier] > RANK[e.desired]) {
        // precisa de uma versão menor: renderiza a camada menor antes de descartar a maior
        if (RANK[e.loading || "none"] < RANK[e.desired] || !e.loading) {
          if (e.desired === "thumb" || e.desired === "mid" || e.desired === "hi") {
            this.requestLower(n, e);
          }
        }
      }
    });
  }

  async requestLower(n, e) {
    if (this.running.has(`${n}`)) return;
    const tier = e.desired;
    const abort = new AbortController();
    this.running.set(`${n}`, { abort });
    e.loading = tier;
    try {
      const canvas = await this.pdf.renderPage(n, {
        width: this.quality[tier],
        extraMm: this.regionFor(n, tier),
        signal: abort.signal,
      });
      if (!canvas || this.disposed) return;
      if (RANK[e.desired] !== RANK[tier]) return; // mudou de ideia
      const texture = this.makeTexture(canvas, tier);
      const old = e.texture;
      e.texture = texture;
      e.tier = tier;
      this.listeners.get(n)?.forEach((fn) => fn(texture, tier));
      if (old) {
        old.dispose();
        this.stats.disposed++;
      }
    } catch (err) {
      console.warn(`[livro] falha ao reduzir a página ${n}`, err);
    } finally {
      e.loading = null;
      this.running.delete(`${n}`);
      this.pump();
    }
  }

  /** Recria tudo (ex.: contexto WebGL restaurado). */
  reset() {
    this.entries.forEach((e) => {
      e.texture?.dispose();
      e.texture = null;
      e.tier = "none";
    });
    this.readyQueue = [];
    this.setFocus(this.focus);
  }

  memoryReport() {
    const bytes = { ultra: 0, hi: 0, mid: 0, thumb: 0 };
    const counts = { ultra: 0, hi: 0, mid: 0, thumb: 0 };
    this.entries.forEach((e) => {
      if (e.tier === "none") return;
      const w = this.quality[e.tier];
      const h = Math.round((w * 210) / 148);
      bytes[e.tier] += w * h * 4 * (e.tier === "thumb" ? 1 : 1.33);
      counts[e.tier]++;
    });
    return { counts, mb: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, +(v / 1048576).toFixed(1)])) };
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.downgradeTimer);
    this.running.forEach((r) => r.abort.abort());
    this.entries.forEach((e) => e.texture?.dispose());
    this.entries.clear();
    this.listeners.clear();
  }
}
