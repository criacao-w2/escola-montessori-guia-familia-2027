import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAtomValue } from "jotai";
import { easing } from "maath";
import { readingAtom } from "../../state/reading";

const FLOAT_TILT = -Math.PI / 4; // inclinação do projeto original
const TABLE_TILT = -Math.PI / 2; // deitado sobre a mesa

/**
 * Mesmo movimento do <Float> do projeto original (mesmas fórmulas e parâmetros:
 * speed 2, rotationIntensity 2, floatIntensity 1), com uma intensidade que vai a zero
 * no modo leitura — o livro para de flutuar e se deita suavemente.
 */
export function BookRig({ children }) {
  const reading = useAtomValue(readingAtom);
  const outer = useRef();
  const inner = useRef();
  const amp = useRef({ v: 1 });
  const offset = useRef(Math.random() * 10000);

  useFrame((state, delta) => {
    const o = outer.current;
    const g = inner.current;
    if (!o || !g) return;
    easing.damp(amp.current, "v", reading ? 0 : 1, 0.45, delta);
    easing.damp(o.rotation, "x", reading ? TABLE_TILT : FLOAT_TILT, 0.5, delta);
    const a = amp.current.v;
    const speed = 2;
    const t = offset.current + state.clock.getElapsedTime();
    const w = (t / 4) * speed;
    g.rotation.x = (Math.cos(w) / 8) * 2 * a;
    g.rotation.y = (Math.sin(w) / 8) * 2 * a;
    g.rotation.z = (Math.sin(w) / 20) * 2 * a;
    g.position.y = (Math.sin(w) / 10) * 1 * a;
  });

  return (
    <group ref={outer} rotation-x={FLOAT_TILT}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
