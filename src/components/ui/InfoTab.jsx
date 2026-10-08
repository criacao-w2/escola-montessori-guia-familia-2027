import { useEffect, useRef, useState } from "react";

/** Ficha técnica do impresso (especificação sugerida). */
export const SPECS = [
  { part: "Formato fechado", spec: <>A5 — 148 × 210 mm</> },
  { part: "Miolo", spec: <>Couchê fosco branco, <strong>115 g/m²</strong>, impressão colorida frente e verso (4/4 cores)</> },
  { part: "Capa flexível", spec: <>Couchê fosco, <strong>250 g/m²</strong>, impressão colorida, com laminação BOPP fosca na face externa</> },
  { part: "Encadernação", spec: <>Brochura com lombada quadrada; a gráfica define se a cola PUR é adequada ao papel e à espessura finais</> },
  { part: "Lombada", spec: <>Medida a confirmar pela gráfica após fechar a paginação e escolher o papel</> },
];

/** Aba discreta saindo da borda direita; abre a ficha técnica. */
export function InfoTab() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const tabRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); // os outros atalhos ignoram o Esc já tratado
        setOpen(false);
        tabRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !tabRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ficha-tecnica"
        aria-label="Ficha técnica do impresso"
        title="Ficha técnica"
        className={`pointer-events-auto fixed right-0 bottom-28 z-20 flex h-16 w-6 items-center justify-center rounded-l-xl border border-r-0 border-white/10 bg-white/[0.05] text-white/45 backdrop-blur-sm transition-all duration-300 hover:w-8 hover:text-white/85 ${
          open ? "w-8 text-white/85" : ""
        }`}
      >
        <span className="text-[12px] font-medium italic" style={{ fontFamily: "Georgia, serif" }}>
          i
        </span>
      </button>

      <div
        ref={panelRef}
        id="ficha-tecnica"
        role="dialog"
        aria-label="Ficha técnica"
        aria-hidden={!open}
        className={`ui-panel fixed bottom-28 right-11 z-20 w-[min(88vw,420px)] origin-bottom-right rounded-2xl p-5 transition-all duration-300 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "invisible pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Especificação sugerida</p>
            <h2 className="mt-0.5 text-[15px] font-medium text-white/90">Ficha técnica do impresso</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar ficha técnica" className="ui-ghost -mr-1 -mt-1 px-1 text-[18px] leading-none">
            ×
          </button>
        </div>
        <dl className="divide-y divide-white/[0.07]">
          {SPECS.map((r) => (
            <div key={r.part} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5">
              <dt className="text-[10.5px] uppercase tracking-[0.12em] text-white/40">{r.part}</dt>
              <dd className="text-[12.5px] leading-relaxed text-white/80 [&_strong]:font-semibold [&_strong]:text-white">{r.spec}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
