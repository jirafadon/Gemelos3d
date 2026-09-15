/**
 * Ficha geométrica serializable y estable para modelos 3D.
 * No depende de Three.js ni del DOM.
 */

import { dimensionsFromBounds } from './geometry-measure.js';
import { isValidDimensions, normalizeDimensions } from './measure.js';

function normalizeId(value, fallback = 'model') {
  const id = String(value ?? '').trim();
  return id || fallback;
}

function normalizeSource(value) {
  const source = String(value ?? '').trim();
  return source || 'unknown';
}

export function createGeometryProfile(input = {}) {
  const dimensions = normalizeDimensions(input.dimensions ?? dimensionsFromBounds(input.bounds));
  const volume = dimensions.width * dimensions.height * dimensions.depth;

  return {
    schemaVersion: 1,
    id: normalizeId(input.id),
    name: String(input.name ?? '').trim() || normalizeId(input.id),
    source: normalizeSource(input.source),
    dimensions,
    valid: isValidDimensions(dimensions),
    volume,
    center: {
      x: Number.isFinite(Number(input.center?.x)) ? Number(input.center.x) : 0,
      y: Number.isFinite(Number(input.center?.y)) ? Number(input.center.y) : 0,
      z: Number.isFinite(Number(input.center?.z)) ? Number(input.center.z) : 0
    },
    metadata: { ...(input.metadata ?? {}) }
  };
}

export function updateGeometryProfile(profile, patch = {}) {
  return createGeometryProfile({ ...profile, ...patch });
}
