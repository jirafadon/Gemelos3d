/**
 * Modelo puro de cama de fabricación.
 * No depende del DOM ni de Three.js.
 * Todas las medidas están expresadas en milímetros.
 */

const MIN_DIMENSION = 1;

export function normalizeBed(input = {}) {
  const width = Math.max(MIN_DIMENSION, Number(input.width) || 1);
  const depth = Math.max(MIN_DIMENSION, Number(input.depth) || 1);
  const height = Math.max(MIN_DIMENSION, Number(input.height) || 1);
  const margin = Math.max(0, Number(input.margin) || 0);
  const purge = normalizePurge(input.purge);
  return { width, depth, height, margin, purge };
}

export function normalizePurge(input = {}) {
  if (input.mode === 'none' || input.enabled === false) {
    return { enabled: false, width: 0, depth: 0, corner: input.corner || 'tr' };
  }

  return {
    enabled: true,
    width: Math.max(0, Number(input.width) || 0),
    depth: Math.max(0, Number(input.depth) || 0),
    corner: ['tl', 'tr', 'bl', 'br'].includes(input.corner) ? input.corner : 'tr'
  };
}

/**
 * Devuelve el rectángulo real donde puede colocarse una pieza.
 * x0/x1/y0/y1 están en coordenadas de cama, con el centro en 0.
 */
export function computeUsefulArea(input = {}) {
  const bed = normalizeBed(input);
  const halfW = bed.width / 2;
  const halfD = bed.depth / 2;
  const x0 = -halfW + bed.margin;
  const x1 = halfW - bed.margin;
  const y0 = -halfD + bed.margin;
  const y1 = halfD - bed.margin;

  if (!bed.purge.enabled || bed.purge.width <= 0 || bed.purge.depth <= 0) {
    return { x0, y0, x1, y1, width: Math.max(0, x1 - x0), depth: Math.max(0, y1 - y0) };
  }

  const purge = bed.purge;
  const result = { x0, y0, x1, y1 };
  if (purge.corner === 'tl' || purge.corner === 'bl') result.x0 += purge.width;
  else result.x1 -= purge.width;
  if (purge.corner === 'bl' || purge.corner === 'br') result.y0 += purge.depth;
  else result.y1 -= purge.depth;

  return {
    ...result,
    width: Math.max(0, result.x1 - result.x0),
    depth: Math.max(0, result.y1 - result.y0)
  };
}

export function computeKeepout(input = {}) {
  const bed = normalizeBed(input);
  if (!bed.purge.enabled || bed.purge.width <= 0 || bed.purge.depth <= 0) return null;

  const halfW = bed.width / 2;
  const halfD = bed.depth / 2;
  const x0 = -halfW + bed.margin;
  const x1 = halfW - bed.margin;
  const y0 = -halfD + bed.margin;
  const y1 = halfD - bed.margin;
  const p = bed.purge;

  if (p.corner === 'tl') return { x0, x1: x0 + p.width, y0: y1 - p.depth, y1 };
  if (p.corner === 'tr') return { x0: x1 - p.width, x1, y0: y1 - p.depth, y1 };
  if (p.corner === 'bl') return { x0, x1: x0 + p.width, y0, y1: y0 + p.depth };
  return { x0: x1 - p.width, x1, y0, y1: y0 + p.depth };
}

export function fitsInsideArea(width, depth, area, epsilon = 0.001) {
  return width <= area.width + epsilon && depth <= area.depth + epsilon;
}

export function placementFits(rect, area, epsilon = 0.001) {
  return rect.x0 >= area.x0 - epsilon && rect.x1 <= area.x1 + epsilon &&
    rect.y0 >= area.y0 - epsilon && rect.y1 <= area.y1 + epsilon;
}

export function intersectsKeepout(rect, keepout, epsilon = 0.001) {
  if (!keepout) return false;
  return rect.x0 < keepout.x1 - epsilon && rect.x1 > keepout.x0 + epsilon &&
    rect.y0 < keepout.y1 - epsilon && rect.y1 > keepout.y0 + epsilon;
}
