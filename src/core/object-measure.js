/**
 * Medición de objetos 3D completos y jerarquías.
 * El core no depende de Three.js: trabaja con un adaptador de bounds.
 */

import { dimensionsFromBounds } from './geometry-measure.js';

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mergeBounds(target, bounds) {
  if (!bounds?.min || !bounds?.max) return target;

  target.min.x = Math.min(target.min.x, finite(bounds.min.x));
  target.min.y = Math.min(target.min.y, finite(bounds.min.y));
  target.min.z = Math.min(target.min.z, finite(bounds.min.z));
  target.max.x = Math.max(target.max.x, finite(bounds.max.x));
  target.max.y = Math.max(target.max.y, finite(bounds.max.y));
  target.max.z = Math.max(target.max.z, finite(bounds.max.z));
  target.hasBounds = true;
  return target;
}

export function measureBoundsCollection(boundsList = []) {
  const merged = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
    hasBounds: false
  };

  for (const bounds of boundsList) mergeBounds(merged, bounds);

  if (!merged.hasBounds) return dimensionsFromBounds();
  return dimensionsFromBounds(merged);
}

export function measureObjectHierarchy(object, getBounds) {
  if (!object || typeof getBounds !== 'function') return dimensionsFromBounds();

  const bounds = [];
  const visit = node => {
    if (!node) return;
    const nodeBounds = getBounds(node);
    if (nodeBounds) bounds.push(nodeBounds);
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };

  visit(object);
  return measureBoundsCollection(bounds);
}

export function measureObjectCollection(objects = [], getBounds) {
  return measureBoundsCollection(
    objects.flatMap(object => {
      if (!object || typeof getBounds !== 'function') return [];
      return [getBounds(object)].filter(Boolean);
    })
  );
}
