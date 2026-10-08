import { CanvasTexture, Color, MeshLambertMaterial, SRGBColorSpace } from "three";
import { BRAND } from "../../config/brand";

let placeholder;
/** Textura 1x1 branca compartilhada enquanto a página real ainda não foi renderizada. */
export function getPlaceholderTexture() {
  if (placeholder) return placeholder;
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f6f4ee";
  ctx.fillRect(0, 0, 2, 2);
  placeholder = new CanvasTexture(c);
  placeholder.colorSpace = SRGBColorSpace;
  return placeholder;
}

/**
 * Material de uma face (frente/verso). Mantém o brilho do papel fosco e injeta:
 *  - sombra suave na região da lombada (contato página ↔ lombada);
 *  - brilho discreto no canto externo ao passar o mouse (canto interativo).
 * Não altera as cores da arte do PDF fora dessas regiões.
 */
export function createFaceMaterial({ side, isCover, gutterUv }) {
  const uniforms = {
    uGutter: { value: isCover ? 0.1 : 0.14 },
    uGutterWidth: { value: gutterUv },
    uHover: { value: 0 },
    uHoverColor: { value: new Color(BRAND.colors.accent) },
  };
  // Papel couchê fosco / capa com laminação BOPP fosca: reflexo difuso (sem brilho especular),
  // o que mantém as cores da arte do PDF fiéis.
  const mat = new MeshLambertMaterial({
    color: "#ffffff",
    map: getPlaceholderTexture(),
    toneMapped: false,
  });
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGutter = uniforms.uGutter;
    shader.uniforms.uGutterWidth = uniforms.uGutterWidth;
    shader.uniforms.uHover = uniforms.uHover;
    shader.uniforms.uHoverColor = uniforms.uHoverColor;
    const hinge = side === "front" ? "vMapUv.x" : "(1.0 - vMapUv.x)";
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uGutter;\nuniform float uGutterWidth;\nuniform float uHover;\nuniform vec3 uHoverColor;\nvoid main() {"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float hingeX = ${hinge};
        float gs = 1.0 - smoothstep(0.0, uGutterWidth, hingeX);
        diffuseColor.rgb *= 1.0 - uGutter * gs * gs;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float cornerGlow = smoothstep(0.72, 1.0, hingeX);
        totalEmissiveRadiance += uHoverColor * uHover * cornerGlow * 0.16;`
      );
  };
  mat.customProgramCacheKey = () => `face-${side}`;
  return mat;
}

export function createEdgeMaterial(color) {
  return new MeshLambertMaterial({ color, toneMapped: false });
}
