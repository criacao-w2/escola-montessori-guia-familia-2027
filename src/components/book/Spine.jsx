import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Float32BufferAttribute, MeshLambertMaterial } from "three";
import { getPlaceholderTexture } from "./leafMaterials";

/**
 * Lombada quadrada: a capa flexível envolve o miolo e liga a capa à contracapa.
 * É uma faixa da mesma cartolina da capa que acompanha, a cada quadro, as raízes
 * da capa e da contracapa (livro fechado: faixa reta na espessura do bloco;
 * aberto: faixa por baixo das duas pilhas).
 *
 * Cor: amostrada da própria textura da capa (faixa amarela do topo da página 1),
 * para ser exatamente o amarelo impresso — nada de cor aproximada.
 */
const COVER_YELLOW_UV = [0.5, 0.975];

export function Spine({ model, controller, manager }) {
  const ref = useRef();
  const N = model.leafCount;
  const tc = model.coverThickness;
  const H = model.height + model.overhang * 2;

  const { geometry, material } = useMemo(() => {
    const g = new BoxGeometry(1, H, tc);
    // todos os vértices apontam para o mesmo ponto amarelo da capa
    const uv = new Float32Array(g.attributes.uv.count * 2);
    for (let i = 0; i < uv.length; i += 2) {
      uv[i] = COVER_YELLOW_UV[0];
      uv[i + 1] = COVER_YELLOW_UV[1];
    }
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    const m = new MeshLambertMaterial({ color: "#ffffff", map: getPlaceholderTexture(), toneMapped: false });
    return { geometry: g, material: m };
  }, [H, tc]);

  useEffect(() => manager.subscribe(1, (tex) => (material.map = tex)), [manager, material]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame(() => {
    const mesh = ref.current;
    const groups = controller.current.groups;
    if (!mesh || !groups?.[0] || !groups?.[N - 1]) return;
    const a = groups[0].position;
    const b = groups[N - 1].position;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const theta = Math.atan2(-dz, dx);
    // normal da faixa; aponta para fora do livro (oposto ao lado das páginas)
    let nx = Math.sin(theta);
    let nz = Math.cos(theta);
    const d = controller.current.delayed;
    const pages = d <= 0 ? [0, -1] : d >= N ? [0, 1] : [1, 0]; // (x, z) para onde as folhas vão
    if (nx * pages[0] + nz * pages[1] > 0) {
      nx = -nx;
      nz = -nz;
    }
    mesh.position.set((a.x + b.x) / 2 + (nx * tc) / 2, 0, (a.z + b.z) / 2 + (nz * tc) / 2);
    mesh.rotation.set(0, theta, 0);
    mesh.scale.x = Math.max(len + tc, tc);
  });

  return <mesh ref={ref} geometry={geometry} material={material} castShadow />;
}
