/**
 * Curva das folhas — constantes ORIGINAIS do projeto (Book.jsx do repositório base).
 * Ficam aqui para que a folha e a câmera do modo leitura usem exatamente a mesma conta.
 */
export const CURVE = {
  easingFactor: 0.5,
  easingFactorFold: 0.3,
  insideCurveStrength: 0.18,
  outsideCurveStrength: 0.05,
  turningCurveStrength: 0.09,
  turnMs: 400,
};

/** Ângulo de repouso do osso i (sem virada em andamento) para a rotação-alvo T. */
export function restBoneAngle(i, T) {
  const inside = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
  const outside = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
  return CURVE.insideCurveStrength * inside * T - CURVE.outsideCurveStrength * outside * T;
}

/**
 * Perfil de uma folha aberta em repouso (em unidades do modelo):
 *  reach = alcance lateral a partir da lombada; maxY/endY = altura máxima / da borda externa.
 */
export function restProfile(width, segments = 30) {
  const T = Math.PI / 2;
  const segW = width / segments;
  let phi = 0;
  let x = 0;
  let y = 0;
  let maxY = 0;
  let minY = 0;
  for (let k = 0; k < segments; k++) {
    phi += restBoneAngle(k, T);
    x += segW * Math.sin(phi);
    y += segW * Math.cos(phi);
    maxY = Math.max(maxY, y);
    minY = Math.min(minY, y);
  }
  return { reach: x, maxY, minY, endY: y };
}
