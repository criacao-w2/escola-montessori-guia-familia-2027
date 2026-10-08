import { useCallback, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import manifest from "../../data/book-manifest.json";
import { pageAtom, tocOpenAtom } from "../../state/bookState";
import { sendViewCommand } from "../../state/viewBus";
import { focusSideAtom, isPortrait, readingAtom } from "../../state/reading";

const LEAVES = manifest.pageCount / 2;

/**
 * Navegação sincronizada: o destino é sempre um único átomo (pageAtom).
 * No modo leitura em tela em pé (uma página por vez), "próxima" primeiro passa
 * da página esquerda para a direita e só então vira a folha — a ordem natural de leitura.
 */
export function useBookNavigation() {
  const [page, setPage] = useAtom(pageAtom);
  const [side, setSide] = useAtom(focusSideAtom);
  const reading = useAtomValue(readingAtom);
  const onePage = () => reading && isPortrait() && page > 0 && page < LEAVES;

  const goTo = useCallback(
    (p) => {
      setPage(Math.min(LEAVES, Math.max(0, Math.round(p))));
      setSide("left");
    },
    [setPage, setSide]
  );
  const next = useCallback(() => {
    if (onePage() && side === "left") return setSide("right");
    setPage((p) => Math.min(LEAVES, p + 1));
    setSide("left");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPage, setSide, side, reading, page]);
  const prev = useCallback(() => {
    if (onePage() && side === "right") return setSide("left");
    setPage((p) => Math.max(0, p - 1));
    setSide("right");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPage, setSide, side, reading, page]);
  /** Vai até a página do arquivo e, no celular em modo leitura, enquadra o lado certo. */
  const goToFilePage = useCallback(
    (filePage) => {
      setPage(Math.min(LEAVES, Math.max(0, Math.floor(filePage / 2))));
      setSide(filePage % 2 === 0 ? "left" : "right");
    },
    [setPage, setSide]
  );
  return { page, goTo, goToFilePage, next, prev, atStart: page <= 0, atEnd: page >= LEAVES, leaves: LEAVES };
}

/** Liga/desliga o modo leitura. */
export function useReadingMode() {
  const [reading, setReading] = useAtom(readingAtom);
  const toggle = useCallback(() => setReading((r) => !r), [setReading]);
  return { reading, setReading, toggle };
}

/** Atalhos de teclado (não interfere em campos de texto nem em combinações do navegador). */
export function useKeyboardShortcuts() {
  const { next, prev, goTo } = useBookNavigation();
  const [tocOpen, setTocOpen] = useAtom(tocOpenAtom);
  const { reading, setReading, toggle } = useReadingMode();

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) {
        if (e.key === "Escape") t.blur?.();
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(LEAVES);
          break;
        case "l":
        case "L":
          toggle();
          break;
        case "Escape":
          if (tocOpen) setTocOpen(false);
          else if (reading) setReading(false);
          else sendViewCommand("reset");
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, tocOpen, setTocOpen, reading, setReading, toggle]);
}

export function useTocOpen() {
  return useAtomValue(tocOpenAtom);
}
