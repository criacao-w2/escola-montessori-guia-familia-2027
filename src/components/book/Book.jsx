import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";

import { BRAND } from "../../config/brand";
import { PHYSICS } from "../../config/book.config";
import { pageAtom } from "../../state/bookState";
import { useAtomValue } from "jotai";
import { readingAtom } from "../../state/reading";
import { Leaf } from "./Leaf";
import { Spine } from "./Spine";

/**
 * Controla o livro: a posição-destino vem do estado (jotai); a posição exibida
 * ("delayed") avança em passos, sem re-renderizar o React (fica em um ref).
 * Saltos longos viram uma virada rápida em cascata com duração total controlada.
 */
export function Book({ model, manager }) {
  const [target] = useAtom(pageAtom);
  const N = model.leafCount;

  const controller = useRef({
    target,
    delayed: target,
    openness: 0,
    acc: 0,
    gesture: null,
    beginGesture: null,
  });
  const groupRef = useRef();
  if (import.meta.env.DEV) window.__ctl = controller;

  // destino mudou → atualiza foco das texturas
  useEffect(() => {
    controller.current.target = target;
    manager.setFocus(target);
  }, [target, manager]);

  // resolução máxima nas páginas visíveis quando o livro é visto de perto
  const reading = useAtomValue(readingAtom);
  useEffect(() => {
    manager.setUltra(reading || target === 0 || target === N);
  }, [reading, target, N, manager]);

  useFrame((_, delta) => {
    const c = controller.current;

    // passos da animação (cascata)
    if (c.delayed !== c.target) {
      const diff = Math.abs(c.target - c.delayed);
      const interval =
        diff > 2 ? PHYSICS.stepMsFar : PHYSICS.stepMsNear; // 50 ms / 150 ms, como no original
      c.acc += delta * 1000;
      let guard = 0;
      while (c.acc >= interval && c.delayed !== c.target && guard++ < 60) {
        c.delayed += c.target > c.delayed ? 1 : -1;
        c.acc -= interval;
      }
    } else {
      c.acc = 0;
    }

    manager.flush();
  });

  const leaves = useMemo(() => model.leaves, [model]);

  return (
    <group ref={groupRef} rotation-y={-Math.PI / 2}>
      <Spine model={model} controller={controller} manager={manager} />
      {leaves.map((leaf) => (
        <Leaf key={leaf.index} model={model} leaf={leaf} controller={controller} manager={manager} />
      ))}
    </group>
  );
}

