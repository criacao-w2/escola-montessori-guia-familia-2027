import { atom } from "jotai";

/** Modo leitura: o livro para de flutuar e fica deitado, visto de cima. */
export const readingAtom = atom(false);

/** Em telas "em pé" (celular), o modo leitura enquadra uma página por vez: "left" ou "right". */
export const focusSideAtom = atom("left");

export const isPortrait = () =>
  typeof window !== "undefined" && window.innerWidth < window.innerHeight * 0.95;

/** Lado efetivamente enquadrado (com o livro fechado só existe um lado). */
export function effectiveSide(page, leafCount, side) {
  if (page <= 0) return "right";
  if (page >= leafCount) return "left";
  return side;
}
