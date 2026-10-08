import { BoxGeometry, Float32BufferAttribute, Uint16BufferAttribute, Vector3 } from "three";
import { PHYSICS } from "../../config/book.config";

const cache = new Map();

/**
 * Geometria de uma folha (BoxGeometry com "skin" por segmentos), igual à do projeto
 * original, mas com dimensões físicas reais. A dobradiça fica em x = 0 (lombada).
 */
export function getLeafGeometry({ width, height, depth, segments = PHYSICS.segments }) {
  const key = [width, height, depth, segments].map((v) => +v.toFixed(5)).join("|");
  if (cache.has(key)) return cache.get(key);

  const segW = width / segments;
  const geo = new BoxGeometry(width, height, depth, segments, 2);
  geo.translate(width / 2, 0, 0);

  const pos = geo.attributes.position;
  const v = new Vector3();
  const skinIndexes = [];
  const skinWeights = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const f = v.x / segW;
    const idx = Math.min(segments - 1, Math.max(0, Math.floor(f + 1e-6)));
    const w = Math.min(1, Math.max(0, f - idx));
    skinIndexes.push(idx, idx + 1, 0, 0);
    skinWeights.push(1 - w, w, 0, 0);
  }
  geo.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4));
  geo.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4));
  geo.userData = { segW, segments, width };
  cache.set(key, geo);
  return geo;
}
