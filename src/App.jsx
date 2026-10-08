import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { Scene } from "./components/scene/Scene";
import { BookUI } from "./components/ui/BookUI";
import { LoadingOverlay } from "./components/ui/Overlays";
import { useKeyboardShortcuts } from "./components/ui/useBookNavigation";
import { useFlipSound } from "./components/ui/useFlipSound";
import { initBook } from "./lib/bookRuntime";
import { applyBrandCssVars } from "./config/brand";
import { loadStateAtom } from "./state/bookState";
import { useState } from "react";

export default function App() {
  const [book, setBook] = useState(null);
  const setLoad = useSetAtom(loadStateAtom);
  useKeyboardShortcuts();
  useFlipSound();

  useEffect(() => {
    applyBrandCssVars();
    let off = () => {};
    let timer;
    initBook()
      .then((b) => {
        setBook(b);
        setLoad({ status: "loading", message: "Preparando as páginas…", progress: 0.5 });
        const ready = () => setLoad({ status: "ready", message: "", progress: 1 });
        off = b.manager.on((e) => e.type === "focus-ready" && ready());
        timer = setTimeout(ready, 12000);
        if (b.manager.isFocusReady?.()) ready();
      })
      .catch((e) => {
        console.error(e);
        setLoad({ status: "error", message: "Verifique sua conexão e tente novamente.", progress: 0 });
      });
    return () => { off(); clearTimeout(timer); };
  }, [setLoad]);

  return (
    <>
      <BookUI book={book} />
      <LoadingOverlay />
      {book && <Scene model={book.model} manager={book.manager} />}
    </>
  );
}
