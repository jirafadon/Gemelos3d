/**
 * Puente entre una caja de límites de geometría y la medición normalizada.
 * No depende de Three.js: acepta cualquier objeto con min/max {x,y,z}.
 */

import { measureBox } from './measure.js';

function coordinate(point, axis) {
  const value = Number(point?.[axis]);
  return Number.isFinite(value) ? value : 0;
}

export function dimensionsFromBounds(bounds = {}) {
  const min = bounds.min ?? {};
  const max = bounds.max ?? {};

  return measureBox({
    width: Math.abs(coordinate(max, 'x') - coordinate(min, 'x')),
    height: Math.abs(coordinate(max, 'y') - coordinate(min, 'y')),
    depth: Math.abs(coordinate(max, 'z') - coordinate(min, 'z'))
  });
}

export function dimensionsFromBoundingBox(boundingBox) {
  if (!boundingBox) return measureBox();
  return dimensionsFromBounds(boundingBox);
}

export function dimensionsFromGeometry(geometry) {
  if (!geometry) return measureBox();

  if (!geometry.boundingBox && typeof geometry.computeBoundingBox === 'function') {
    geometry.computeBoundingBox();
  }

  return dimensionsFromBoundingBox(geometry.boundingBox);
}
