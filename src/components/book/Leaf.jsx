import { useEffect, useMemo, useRef } from "react";
import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { Bone, MathUtils, Skeleton, SkinnedMesh } from "three";
import { useState } from "react";

import { Color } from "three";
import { useAtom } from "jotai";
import { pageAtom } from "../../state/bookState";
import { degToRad } from "three/src/math/MathUtils.js";
import { BRAND } from "../../config/brand";
import { MM, PHYSICS } from "../../config/book.config";
import { getLeafGeometry } from "./leafGeometry";
import { CURVE } from "./leafCurve";
import { readingAtom, focusSideAtom, isPortrait } from "../../state/reading";
import { createEdgeMaterial, createFaceMaterial } from "./leafMaterials";

// Constantes de animação ORIGINAIS do projeto (mantidas)
const { easingFactor, easingFactorFold, insideCurveStrength, outsideCurveStrength, turningCurveStrength } = CURVE;
const TURN_MS = CURVE.turnMs;
/**
 * Empilhamento: cada folha fica afastada da vizinha na diagonal (para fora e para baixo),
 * na medida exata da espessura do papel. Como todas as folhas têm a mesma curva, esse
 * afastamento garante a espessura mínima entre elas em todo o comprimento da página —
 * nenhuma folha atravessa outra, em nenhuma página, e a pilha tem a espessura real do miolo.
 * (O "leque" do original não é mais necessário; com 43 folhas ele abria as pilhas como um leque.)
 */
const STACK_DOWN = 1.3;

/**
 * Uma folha do livro (SkinnedMesh com ossos), baseada no projeto original.
 * Diferenças principais:
 *  - dimensões A5 reais e espessura real (capa mais grossa e mais rígida);
 *  - dobradiça fixa na lombada e curva física de encadernação (a folha "desce"
 *    do ponto de colagem até a pilha da esquerda);
 *  - texturas vindas do PDF, gerenciadas por TextureManager (sem re-render do React).
 */
export function Leaf({ model, leaf, controller, manager }) {
  const group = useRef();
  const meshRef = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(controller.current.delayed > leaf.index);
  const awakeUntil = useRef(performance.now() + 4000);
        const [, setPage] = useAtom(pageAtom);
  const [reading] = useAtom(readingAtom);
  const [focusSide, setFocusSide] = useAtom(focusSideAtom);
  const readingRef = useRef(reading);
  readingRef.current = reading;
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);
  const hl = useRef(false);
  hl.current = highlighted;

  const isCover = leaf.isCover;
  const segments = PHYSICS.segments;

  const { mesh, bones, faceMats } = useMemo(() => {
    const extra = isCover ? model.overhang : 0;
    const width = model.width; // mesma largura das folhas (curvas idênticas)
    const height = model.height + extra * 2;
    const geometry = getLeafGeometry({ width, height, depth: leaf.thickness, segments });
    const segW = geometry.userData.segW;

    const boneList = [];
    for (let i = 0; i <= segments; i++) {
      const b = new Bone();
      b.position.x = i === 0 ? 0 : segW;
      if (i > 0) boneList[i - 1].add(b);
      boneList.push(b);
    }
    const skeleton = new Skeleton(boneList);

    const gutterUv = (0.14 * model.width) / width;
    const front = createFaceMaterial({ side: "front", isCover, gutterUv });
    const back = createFaceMaterial({ side: "back", isCover, gutterUv });
    const edge = createEdgeMaterial(isCover ? "#dcd7cc" : leaf.index % 2 ? "#e9e5db" : "#f1eee6");
    const hinge = createEdgeMaterial(BRAND.colors.spine); // lombada quadrada
    front.emissive = new Color("orange");
    back.emissive = new Color("orange");
    front.emissiveIntensity = back.emissiveIntensity = 0;
    const mats = [edge, hinge, edge, edge, front, back];

    const m = new SkinnedMesh(geometry, mats);
    m.castShadow = true;
    m.receiveShadow = false;
    m.frustumCulled = false;
    m.add(skeleton.bones[0]);
    m.bind(skeleton);


    return { mesh: m, bones: boneList, faceMats: [front, back] };
  }, [model, leaf, isCover, segments]);

  // a lombada (Spine) lê a posição das capas
  useEffect(() => {
    controller.current.groups ||= [];
    controller.current.groups[leaf.index] = group.current;
  }, [controller, leaf.index]);

  // Texturas: frente e verso vêm do gerenciador (troca imperativa, sem React)
  useEffect(() => {
    const unsubs = [
      manager.subscribe(leaf.frontPage, (tex) => {
        faceMats[0].map = tex;
        awakeUntil.current = performance.now() + 500;
      }),
      manager.subscribe(leaf.backPage, (tex) => {
        faceMats[1].map = tex;
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [manager, leaf, faceMats]);

  useEffect(
    () => () => {
      faceMats.forEach((m) => m.dispose());
      mesh.material.forEach?.((m) => m.dispose());
    },
    [mesh, faceMats]
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const ctl = controller.current;
    const now = performance.now();
    const opened = ctl.delayed > leaf.index;
    const bookClosed = ctl.delayed === 0 || ctl.delayed === model.leafCount;

    if (lastOpened.current !== opened) {
      turnedAt.current = now;
      lastOpened.current = opened;
      awakeUntil.current = now + 4200;
    }

    // realce ao passar o mouse (original)
    const target = hl.current && !readingRef.current ? 0.22 : 0; // sem brilho no modo leitura
    const cur = faceMats[0].emissiveIntensity;
    if (Math.abs(cur - target) > 0.002) {
      const v = MathUtils.lerp(cur, target, 0.1);
      faceMats[0].emissiveIntensity = faceMats[1].emissiveIntensity = v;
      awakeUntil.current = Math.max(awakeUntil.current, now + 400);
    }

    // posição da raiz da folha na lombada. S = centro da folha na espessura do bloco.
    const P = model.prefix;
    const N = model.leafCount;
    const S = P[leaf.index] + leaf.thickness / 2;
    const d = ctl.delayed;
    let tz;
    let tx;
    if (d === 0) {
      tz = 0;
      tx = -S; // fechado na capa: folhas empilhadas na espessura
    } else if (d === N) {
      tz = 0;
      tx = -(P[N] - S); // fechado na contracapa
    } else {
      const off = P[d] - S; // > 0 pilha esquerda, < 0 pilha direita
      tz = off;
      tx = -STACK_DOWN * Math.abs(off);
    }
    easing.damp(g.position, "z", tz, 0.25, delta);
    easing.damp(g.position, "x", tx, 0.25, delta);

    // Sem "repouso": todas as folhas atualizam a cada quadro, como no original.
    // (O repouso deixava folhas paradas com a curva antiga e elas se atravessavam ao passar o mouse.)

    let turningTime = Math.min(TURN_MS, now - turnedAt.current) / TURN_MS;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    const stiff = 1; // capas com a mesma curva das folhas: evita que se atravessem

    const n = bones.length;
    for (let i = 0; i < n; i++) {
      const tgt = i === 0 ? g : bones[i];
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity = Math.sin(i * Math.PI * (1 / n)) * turningTime;
      let rotationAngle =
        (insideCurveStrength * insideCurveIntensity * targetRotation -
          outsideCurveStrength * outsideCurveIntensity * targetRotation +
          turningCurveStrength * turningIntensity * targetRotation) * (i === 0 ? 1 : stiff);
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      easing.dampAngle(tgt.rotation, "y", rotationAngle, easingFactor, delta);
      const foldIntensity = i > 8 ? Math.sin(i * Math.PI * (1 / n) - 0.5) * turningTime : 0;
      easing.dampAngle(tgt.rotation, "x", foldRotationAngle * foldIntensity * stiff, easingFactorFold, delta);
    }
  });

  return (
    <group ref={group}>
      <primitive
        object={mesh}
        ref={meshRef}
        onPointerEnter={(e) => { e.stopPropagation(); setHighlighted(true); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHighlighted(false); }}
        onClick={(e) => {
          e.stopPropagation();
          const d = controller.current.delayed;
          const opened = d > leaf.index;
          const side = opened ? "left" : "right";
          const open = d > 0 && d < model.leafCount;
          // celular em modo leitura: o primeiro toque enquadra a página; o seguinte vira
          if (reading && isPortrait() && open && focusSide !== side) {
            setFocusSide(side);
            return;
          }
          setPage(opened ? leaf.index : leaf.index + 1);
          setFocusSide(opened ? "right" : "left");
          setHighlighted(false);
        }}
      />
    </group>
  );
}
