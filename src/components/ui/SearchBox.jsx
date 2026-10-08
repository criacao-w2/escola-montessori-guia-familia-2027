import { useEffect, useMemo, useRef, useState } from "react";
import { getSearchIndex, search } from "../../lib/search";
import { useBookNavigation } from "./useBookNavigation";

const KIND = { page: "Página", chapter: "Capítulo", section: "Seção", text: "Texto" };

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/** Busca discreta: um ícone que se abre num campo; procura páginas, capítulos/seções e palavras do PDF. */
export function SearchBox({ pdf }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [active, setActive] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const { goToFilePage } = useBookNavigation();

  const results = useMemo(() => search(query, pages), [query, pages]);
  useEffect(() => setActive(0), [query]);

  // prepara o índice de texto só quando a busca é aberta
  useEffect(() => {
    if (!open || !pdf || pages || status === "loading") return;
    setStatus("loading");
    getSearchIndex(pdf)
      .then((p) => {
        setPages(p);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [open, pdf, pages, status]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // "/" abre a busca; clique fora fecha
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onDown = (e) => {
      if (open && boxRef.current && !boxRef.current.contains(e.target)) {
        setListOpen(false);
        if (!query) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, query]);

  const choose = (r) => {
    if (!r) return;
    goToFilePage(r.filePage);
    setListOpen(false);
    inputRef.current?.blur();
  };

  const close = () => {
    setQuery("");
    setListOpen(false);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="pointer-events-auto relative flex items-center">
      <div
        className={`flex h-9 items-center overflow-hidden rounded-full transition-all duration-300 ${
          open ? "w-[min(78vw,320px)] bg-white/[0.07] ring-1 ring-white/10" : "w-9"
        }`}
      >
        <button
          type="button"
          className="ui-ghost flex h-9 w-9 shrink-0 items-center justify-center"
          onClick={() => (open ? inputRef.current?.focus() : setOpen(true))}
          aria-label="Buscar no guia"
          title="Buscar (/)"
        >
          <IconSearch />
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              choose(results[active]);
            } else if (e.key === "Escape") {
              e.stopPropagation();
              if (listOpen && query) setListOpen(false);
              else close();
            }
          }}
          tabIndex={open ? 0 : -1}
          placeholder="Palavra, capítulo ou página"
          aria-label="Buscar palavra, capítulo ou página"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="resultados-busca"
          className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-[13px] text-white/90 placeholder:text-white/35 focus:outline-none"
        />
        {open && query && (
          <button type="button" onClick={close} aria-label="Limpar busca" className="ui-ghost mr-2 px-1 text-[15px] leading-none">
            ×
          </button>
        )}
      </div>

      {open && listOpen && query.trim() && (
        <div
          id="resultados-busca"
          role="listbox"
          aria-label="Resultados da busca"
          className="ui-panel absolute right-0 top-11 max-h-[60vh] w-[min(86vw,360px)] overflow-y-auto rounded-2xl p-1.5"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-white/45">
              {status === "loading" ? "Preparando a busca…" : status === "error" ? "Não foi possível ler o texto do PDF." : "Nada encontrado."}
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.filePage}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={`block w-full rounded-xl px-3 py-2 text-left transition-colors ${i === active ? "bg-white/[0.07]" : ""}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12.5px] text-white/85">{r.title}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-white/35">{KIND[r.kind]}</span>
                </span>
                {r.snippet && (
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">
                    {r.snippet.before}
                    <mark className="bg-transparent text-[color:var(--brand-accent)]">{r.snippet.match}</mark>
                    {r.snippet.after}
                  </span>
                )}
                {r.detail && <span className="mt-0.5 block text-[10.5px] text-white/30">{r.detail}</span>}
              </button>
            ))
          )}
          {status === "loading" && results.length > 0 && (
            <p className="px-3 pb-2 pt-1 text-[10.5px] text-white/30">Lendo o texto das páginas…</p>
          )}
        </div>
      )}
    </div>
  );
}
