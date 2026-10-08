/**
 * Especificações físicas e de desempenho do livro.
 * Unidade do mundo 3D: 1 unidade = 100 mm  (A5 = 1,48 × 2,10).
 */
export const MM = 0.01;

export const PDF_URL = `${import.meta.env.BASE_URL}book/guia.pdf`;

export const BOOK_SPEC = {
  /** Formato fechado A5 (refilado). */
  trimMm: { width: 148, height: 210 },
  /**
   * Folga de sangria (bleed) do PDF em pontos, medida entre MediaBox e TrimBox
   * (confirmada com pdfinfo: TrimBox = 8,5 8,5 428,03 603,78).
   */
  pdfTrimInsetPt: 8.5,

  /** Papel do miolo: couchê fosco 115 g/m². Espessura (caliper) CONFIGURÁVEL. */
  paperCaliperMm: 0.11,
  /** Capa: couchê fosco 250 g/m² + laminação BOPP fosca. Espessura CONFIGURÁVEL. */
  coverCaliperMm: 0.3,
  /** Pequeno avanço da capa sobre o miolo (usa a sangria do PDF). Máx. 3 mm. */
  coverOverhangMm: 1.0,
  /** Multiplicador visual da espessura (1 = real). Use para exagerar ao ajustar. */
  thicknessScale: 1,
  /** Largura extra da lombada além da espessura do miolo (cola/lombo quadrado). */
  spineWrapMm: 0.6,
};

export const PHYSICS = {
  /** Segmentos (ossos) por folha. */
  segments: 30,
  /** Comprimento do arco da encadernação (onde a folha "desce" para a lombada). */
  gutterCurlMm: 38,
  /** Suavização do giro (s). Maior = mais lento / mais pesado. */
  flipSmoothTime: 0.46,
  coverFlipSmoothTime: 0.62,
  /** Profundidade do "vale" que o papel faz ao descer para a lombada (livro aberto). */
  valleyMm: 2.2,
  /** Intensidade do arqueamento durante o giro (original: 0.09). */
  turningCurve: 0.075,
  foldCurve: 0.3,
  foldSmoothTime: 0.3,
  /** Capas são mais rígidas: multiplicador das deformações. */
  coverStiffness: 0.3,
  /** Passo entre folhas viradas em saltos longos (ms). */
  stepMsNear: 150,
  stepMsFar: 50,
  /** Tempo total desejado para saltos longos (ms) — define o passo. */
  longJumpTotalMs: 700,
};

/** Camadas de textura. Larguras em pixels da região renderizada. */
export const TEXTURE_TIERS = {
  /** só as 2 páginas visíveis, no modo leitura e com o livro fechado */
  ultra: { width: 2048, mip: true },
  hi: { width: 1152, mip: true },
  mid: { width: 512, mip: true },
  thumb: { width: 96, mip: false },
};

/** Quantas páginas manter em cada camada ao redor da posição atual. */
export const TEXTURE_WINDOW = {
  /** páginas visíveis + um par de páginas à frente/atrás */
  hiRadiusPages: 3,
  /** demais páginas próximas */
  midRadiusPages: 9,
  maxConcurrentRenders: 2,
};

/** Reduz a qualidade em telas pequenas/dispositivos modestos. */
export function pickQuality() {
  const mem = typeof navigator !== "undefined" ? navigator.deviceMemory || 8 : 8;
  const small =
    typeof window !== "undefined" &&
    Math.min(window.innerWidth, window.innerHeight) < 600;
  if (mem <= 4 || small) {
    return { ultra: 1400, hi: 896, mid: 384, thumb: 80, maxAnisotropy: 4 };
  }
  return { ultra: TEXTURE_TIERS.ultra.width, hi: TEXTURE_TIERS.hi.width, mid: TEXTURE_TIERS.mid.width, thumb: TEXTURE_TIERS.thumb.width, maxAnisotropy: 8 };
}

/** Escala de exibição: o A5 real (21 cm) ocupa a tela como o livro do projeto original. */
export const VIEW_SCALE = 1.71 / 2.1;
