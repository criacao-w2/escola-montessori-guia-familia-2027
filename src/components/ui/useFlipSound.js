import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { pageAtom, soundAtom } from "../../state/bookState";

/** Toca o som de virar página uma vez a cada mudança de destino (respeita o botão de som). */
export function useFlipSound() {
  const page = useAtomValue(pageAtom);
  const on = useAtomValue(soundAtom);
  const audio = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!on) return;
    try {
      audio.current ||= new Audio(`${import.meta.env.BASE_URL}audios/page-flip-01a.mp3`);
      audio.current.currentTime = 0;
      audio.current.play()?.catch(() => {});
    } catch { /* sem áudio: ignora */ }
  }, [page, on]);
}
