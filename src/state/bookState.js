import { atom } from "jotai";

/** Posição do livro (0 = capa fechada … N = contracapa). É o DESTINO; a animação o alcança. */
export const pageAtom = atom(0);
export const tocOpenAtom = atom(false);
export const loadStateAtom = atom({ status: "loading", message: "Carregando o livro…", progress: 0 });
export const soundAtom = atom(true);
