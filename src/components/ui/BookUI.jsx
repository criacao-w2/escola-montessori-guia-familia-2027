import { useEffect, useRef } from "react";
import { BRAND } from "../../config/brand";
import { isActiveNav, navItems, pageIndicatorLabel } from "../../lib/bookModel";
import { useBookNavigation, useReadingMode } from "./useBookNavigation";
import { SearchBox } from "./SearchBox";
import { InfoTab } from "./InfoTab";

const ITEMS = navItems().map((it) => ({
  ...it,
  short: it.id === "capa" ? "Capa" : it.id === "sumario" ? "Sumário" : it.id === "contracapa" ? "Contracapa" : it.chapterId,
}));

function Chevron({ dir }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

/**
 * Interface mínima: logo, busca e modo leitura no topo; setas nas laterais;
 * capítulos em texto pequeno na base; ficha técnica numa aba na borda direita.
 */
export function BookUI({ book }) {
  const { page, goTo, next, prev, atStart, atEnd } = useBookNavigation();
  const { reading, toggle } = useReadingMode();
  const listRef = useRef(null);
  const label = pageIndicatorLabel(page);

  useEffect(() => {
    const el = listRef.current?.querySelector("[aria-current='true']");
    el?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [page]);

  return (
    <main className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* topo */}
      <div className="flex items-start justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <div
          role="img"
          aria-label={BRAND.logo.alt}
          className="w-14 opacity-90 sm:w-16"
          style={{
            aspectRatio: "1200 / 950",
            backgroundColor: "#ffffff",
            WebkitMaskImage: `url(${BRAND.logo.src})`,
            maskImage: `url(${BRAND.logo.src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            maskMode: "luminance",
          }}
        />
        <div className="flex items-center gap-1.5">
          <SearchBox pdf={book?.pdf} />
          <button
            type="button"
            onClick={toggle}
            aria-pressed={reading}
            aria-label={reading ? "Sair do modo leitura" : "Modo leitura: o livro fica deitado, visto de cima"}
            title={reading ? "Sair da leitura (L ou Esc)" : "Modo leitura (L)"}
            className={`ui-ghost pointer-events-auto flex h-9 w-9 items-center justify-center ${reading ? "!text-[color:var(--brand-accent)]" : ""}`}
          >
            <IconBook />
          </button>
        </div>
      </div>

      {/* setas laterais */}
      <button
        type="button"
        onClick={prev}
        disabled={atStart}
        aria-label="Página anterior"
        title="Página anterior (←)"
        className="ui-ghost pointer-events-auto fixed left-1 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center disabled:opacity-0 sm:left-4"
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        onClick={next}
        disabled={atEnd}
        aria-label="Próxima página"
        title="Próxima página (→)"
        className="ui-ghost pointer-events-auto fixed right-1 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center disabled:opacity-0 sm:right-4"
      >
        <Chevron dir="right" />
      </button>

      {/* base: página atual + capítulos */}
      <nav aria-label="Capítulos do guia" className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 pb-4 sm:pb-6">
        <p className="text-[10.5px] tabular-nums tracking-[0.12em] text-white/35" aria-live="polite">
          {label.primary}
          {label.secondary ? ` ${label.secondary}` : ""}
        </p>
        <div ref={listRef} className="no-scrollbar pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto px-6">
          {ITEMS.map((item) => {
            const active = isActiveNav(item, page);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.position)}
                aria-label={item.aria}
                title={item.aria.replace(/^Ir para /, "")}
                aria-current={active ? "true" : undefined}
                className={`relative shrink-0 px-2 py-1.5 text-[10.5px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                  active ? "text-white" : "text-white/35 hover:text-white/75"
                }`}
              >
                {item.short}
                <span
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ${active ? "w-3 opacity-100" : "w-0 opacity-0"}`}
                  style={{ background: "var(--brand-accent)" }}
                />
              </button>
            );
          })}
        </div>
      </nav>

      <InfoTab />
    </main>
  );
}
