import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, PCFSoftShadowMap } from "three";

import { BRAND } from "../../config/brand";
import { Book } from "../book/Book";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAtomValue } from "jotai";
import { easing } from "maath";
import { CameraRig } from "./CameraRig";
import { BookRig } from "./BookRig";
import { VIEW_SCALE } from "../../config/book.config";
import { pageAtom } from "../../state/bookState";
import { readingAtom } from "../../state/reading";
import { restProfile } from "../book/leafCurve";

/**
 * Chão que recebe a sombra. Flutuando: bem abaixo, como no original.
 * Modo leitura: sobe até encostar no livro (a "mesa"), com a sombra mais marcada.
 */
function Floor({ model }) {
  const reading = useAtomValue(readingAtom);
  const page = useAtomValue(pageAtom);
  const ref = useRef();
  const mat = useRef();
  const closed = page <= 0 || page >= model.leafCount;
  const s = VIEW_SCALE;
  const openLow = (Math.min(restProfile(model.width).minY, 0) - 1.3 * model.thickness) * s;
  const tableY = (closed ? -model.thickness * s : openLow) - 0.003;
  useFrame((_, delta) => {
    if (!ref.current) return;
    easing.damp(ref.current.position, "y", reading ? tableY : -1.5, 0.5, delta);
    easing.damp(mat.current, "opacity", reading ? 0.34 : 0.2, 0.5, delta);
  });
  return (
    <mesh ref={ref} position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial ref={mat} transparent opacity={0.2} />
    </mesh>
  );
}

function Lights() {
  // Iluminação do projeto original, mas 100% local (sem baixar HDR)
  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#ffffff", "#8a8a9a", 0.9]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-far={20}
      />
    </>
  );
}

export function Scene({ model, manager, onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [-0.5, 1, typeof window !== "undefined" && window.innerWidth > 800 ? 4 : 9], fov: 45, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, toneMapping: NoToneMapping, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        manager.setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
        gl.domElement.addEventListener("webglcontextrestored", () => manager.reset());
      }}
    >
      <Suspense fallback={null}>
        <Lights />
        <Floor model={model} />
        <BookRig>
          {/* A5 real (21 cm) reduzido para ocupar a tela como o livro do projeto original */}
          <group scale={VIEW_SCALE}>
            <Book model={model} manager={manager} />
          </group>
        </BookRig>
      </Suspense>
      <CameraRig model={model} />
    </Canvas>
  );
}
