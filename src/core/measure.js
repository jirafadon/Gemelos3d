/**
 * Medición geométrica normalizada en milímetros.
 * Mantiene el cálculo independiente de Three.js y del DOM.
 */

export function normalizeMeasure(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeDimensions(dimensions = {}) {
  return {
    width: Math.max(0, normalizeMeasure(dimensions.width)),
    height: Math.max(0, normalizeMeasure(dimensions.height)),
    depth: Math.max(0, normalizeMeasure(dimensions.depth))
  };
}

export function measureBox({ width = 0, height = 0, depth = 0 } = {}) {
  return normalizeDimensions({ width, height, depth });
}

export function isValidDimensions(dimensions = {}) {
  const normalized = normalizeDimensions(dimensions);
  return normalized.width > 0 && normalized.height > 0 && normalized.depth > 0;
}

export function formatMillimeters(value, decimals = 1) {
  const number = normalizeMeasure(value);
  const digits = Math.max(0, Number(decimals) || 0);
  return `${number.toFixed(digits)} mm`;
}
