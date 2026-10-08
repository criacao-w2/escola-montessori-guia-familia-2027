import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { BRAND } from "../../config/brand";
import { loadStateAtom } from "../../state/bookState";

export function LoadingOverlay() {
  const state = useAtomValue(loadStateAtom);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (state.status === "ready") {
      const t = setTimeout(() => setGone(true), 500);
      return () => clearTimeout(t);
    }
    setGone(false);
  }, [state.status]);
  if (gone) return null;
  const isError = state.status === "error";
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6 text-center transition-opacity duration-500 ${state.status === "ready" ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ background: "var(--brand-bg)" }}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className="h-16 opacity-90"
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
      {isError ? (
        <>
          <p className="max-w-md text-[15px] font-semibold" style={{ color: "var(--brand-text)" }}>Não foi possível abrir o livro.</p>
          <p className="max-w-md text-[13px]" style={{ color: "var(--brand-text-muted)" }}>{state.message}</p>
          <button type="button" className="text-btn" onClick={() => window.location.reload()}>Tentar novamente</button>
        </>
      ) : (
        <>
          <div className="h-1 w-40 overflow-hidden rounded-full" style={{ background: "var(--brand-nav-border)" }}>
            <div className="h-full w-1/3 animate-[carga_1.3s_ease-in-out_infinite] rounded-full" style={{ background: "var(--brand-accent)" }} />
          </div>
          <p className="text-[13px]" style={{ color: "var(--brand-text-muted)" }}>{state.message}</p>
        </>
      )}
    </div>
  );
}

export function ShortcutsHint() {
  return (
    <p
      className="pointer-events-none fixed bottom-[5.2rem] left-8 z-10 hidden max-w-[12rem] text-[11px] leading-relaxed 2xl:block"
      style={{ color: "var(--brand-text-muted)" }}
    >
      <span className="font-semibold" style={{ color: "var(--brand-nav-text)" }}>Atalhos</span>
      <br />← → virar a página · Home capa · End contracapa
      <br />Esc redefinir a visualização
      <br />Arraste uma página para virá-la
    </p>
  );
}
