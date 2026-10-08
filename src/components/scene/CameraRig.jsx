import { useEffect, useMemo, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useAtomValue } from "jotai";
import { MOUSE, TOUCH, Vector3 } from "three";

import { VIEW_SCALE } from "../../config/book.config";
import { pageAtom } from "../../state/bookState";
import { effectiveSide, focusSideAtom, isPortrait, readingAtom } from "../../state/reading";
import { onViewCommand } from "../../state/viewBus";
import { viewRefs } from "../../state/viewRefs";
import { restProfile } from "../book/leafCurve";

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const READ_TILT = 0.2; // ~11° a partir da vertical: visto de cima, sem perder o 3D

/** Posição inicial do projeto original. */
const homePose = () => ({
  position: new Vector3(-0.5, 1, window.innerWidth > 800 ? 4 : 9),
  target: new Vector3(0, 0, 0),
});

/**
 * Enquadramento do modo leitura (livro deitado; a lombada fica na origem).
 * Desktop: a página dupla inteira. Tela em pé: uma página por vez.
 */
function readingPose({ model, page, side, aspect, fovDeg, portrait }) {
  const s = VIEW_SCALE;
  const N = model.leafCount;
  const W = model.width * s;
  const H = (model.height + model.overhang * 2) * s;
  const prof = restProfile(model.width);
  const reach = prof.reach * s;
  const surface = prof.maxY * 0.5 * s; // altura média da página aberta acima da lombada

  let cx;
  let h0;
  let regionW;
  if (page <= 0) {
    cx = W / 2; h0 = 0; regionW = W;
  } else if (page >= N) {
    cx = -W / 2; h0 = 0; regionW = W;
  } else if (portrait) {
    cx = side === "left" ? -reach / 2 : reach / 2; h0 = surface; regionW = reach;
  } else {
    cx = 0; h0 = surface; regionW = reach * 2;
  }

  const tan = Math.tan((fovDeg * Math.PI) / 360);
  // reserva espaço para o logo (topo) e a navegação (base)
  const dH = H / 2 / (tan * 0.7);
  const dW = regionW / 2 / (tan * aspect * 0.92);
  const D = Math.max(dH, dW) * 1.03;

  const target = new Vector3(cx, h0, H * 0.05); // desloca o livro um pouco para cima na tela
  const position = target.clone().add(new Vector3(0, Math.cos(READ_TILT) * D, Math.sin(READ_TILT) * D));
  return { position, target };
}

/** OrbitControls do projeto original + modo leitura + comandos de aproximar/afastar/redefinir. */
export function CameraRig({ model }) {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const reading = useAtomValue(readingAtom);
  const page = useAtomValue(pageAtom);
  const focusSide = useAtomValue(focusSideAtom);
  const anim = useRef(null);
  const [portrait, setPortrait] = useState(isPortrait());

  useEffect(() => setPortrait(isPortrait()), [size.width, size.height]);

  const side = effectiveSide(page, model.leafCount, focusSide);
  const closedKind = page <= 0 ? "front" : page >= model.leafCount ? "back" : "open";
  // o enquadramento só muda quando muda o "tipo" de vista (assim o zoom do leitor é mantido ao virar páginas)
  const poseKey = reading ? `${closedKind}|${portrait && closedKind === "open" ? side : "dupla"}|${size.width}x${size.height}` : "flutuando";

  const animateTo = (pose, dur = 0.9) => {
    const c = viewRefs.controls;
    if (!c) return;
    anim.current = { p0: camera.position.clone(), t0: c.target.clone(), p1: pose.position, t1: pose.target, k: 0, dur };
    c.enabled = false;
  };

  const currentPose = () =>
    reading
      ? readingPose({ model, page, side, aspect: size.width / size.height, fovDeg: camera.fov, portrait })
      : homePose();

  useEffect(() => {
    const c = viewRefs.controls;
    if (!c) return;
    if (reading) {
      c.enableRotate = false; // sem girar sem querer: só aproximar e arrastar
      c.minDistance = 0.6;
      c.maxDistance = 9;
      c.screenSpacePanning = true;
      // um dedo (ou o botão esquerdo) arrasta a página; dois dedos aproximam e arrastam
      c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
      c.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    } else {
      c.enableRotate = true;
      c.minDistance = 0;
      c.maxDistance = Infinity;
      c.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
      c.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    }
    if (poseKey === "flutuando" && !anim.current && camera.position.distanceTo(homePose().position) < 1e-3) return;
    animateTo(currentPose(), reading ? 0.9 : 1.0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey]);

  useEffect(
    () =>
      onViewCommand((cmd) => {
        const c = viewRefs.controls;
        if (!c) return;
        if (cmd === "reset") {
          animateTo(currentPose(), 0.7);
        } else {
          const f = cmd === "zoom-in" ? 0.8 : 1.25;
          camera.position.sub(c.target).multiplyScalar(f).add(c.target);
          c.update();
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, reading, page, side, portrait, size.width, size.height]
  );

  useFrame((_, delta) => {
    const a = anim.current;
    const c = viewRefs.controls;
    if (!a || !c) return;
    a.k = Math.min(1, a.k + delta / a.dur);
    const e = easeInOut(a.k);
    camera.position.lerpVectors(a.p0, a.p1, e);
    c.target.lerpVectors(a.t0, a.t1, e);
    c.update();
    if (a.k >= 1) {
      anim.current = null;
      c.enabled = true;
    }
  });

  if (import.meta.env.DEV) window.__view = { camera, viewRefs };
  return <OrbitControls ref={(c) => (viewRefs.controls = c)} />;
}
