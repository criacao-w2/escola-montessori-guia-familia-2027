/**
 * Identidade visual do VISUALIZADOR (não do conteúdo do PDF).
 * Troque aqui logo e cores sem mexer nos componentes.
 * O logo que aparece dentro das páginas vem do PDF e nunca é alterado.
 */
export const BRAND = {
  name: "Escola Montessori",
  title: "Guia da Família 2027",
  /** Arquivo em /public. Substitua o arquivo ou altere este caminho. */
  logo: {
    src: `${import.meta.env.BASE_URL}brand/logo.png`,
    alt: "Escola Montessori",
    height: 56, // px (desktop)
    heightMobile: 40, // px
  },
  fontFamily: '"Poppins", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Link das fontes do Google usadas acima (opcional). */
  fontStylesheet:
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  colors: {
    primary: "#14268a", // azul do guia
    secondary: "#ffa637", // laranja do guia
    background: "#0d0f2b", // fundo da cena
    backgroundSoft: "#15183f", // painéis
    accent: "#ffa637",
    text: "#f4f3fa",
    textMuted: "#aeb0d4",
    navText: "#ffffff",
    navBackground: "rgba(0,0,0,0.3)", // como o original (bg-black/30)
    navBorder: "transparent",
    navActiveBackground: "#ffa637",
    navActiveText: "#10123a",
    /** Cor da lombada (peça física, não existe no PDF). */
    spine: "#ffa637",
    /** Cor do papel/miolo nas bordas. */
    paperEdge: "#efece4",
    /** Cor do chão que recebe a sombra. */
    shadow: "#000000",
  },
};

/** Publica as cores como variáveis CSS (usadas pela interface). */
export function applyBrandCssVars(root = document.documentElement) {
  const c = BRAND.colors;
  const map = {
    "--brand-primary": c.primary,
    "--brand-secondary": c.secondary,
    "--brand-bg": c.background,
    "--brand-bg-soft": c.backgroundSoft,
    "--brand-accent": c.accent,
    "--brand-text": c.text,
    "--brand-text-muted": c.textMuted,
    "--brand-nav-text": c.navText,
    "--brand-nav-bg": c.navBackground,
    "--brand-nav-border": c.navBorder,
    "--brand-nav-active-bg": c.navActiveBackground,
    "--brand-nav-active-text": c.navActiveText,
    "--brand-font": BRAND.fontFamily,
  };
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
  if (BRAND.fontStylesheet && !document.getElementById("brand-font")) {
    const link = document.createElement("link");
    link.id = "brand-font";
    link.rel = "stylesheet";
    link.href = BRAND.fontStylesheet;
    document.head.appendChild(link);
  }
  document.title = `${BRAND.title} — ${BRAND.name}`;
}
