/**
 * Convierte componentes extraídos en fichas geométricas individuales.
 * Une identidad, medición y clasificación sin acoplarse a Three.js.
 */

import { createGeometryProfile } from './geometry-profile.js';
import { dimensionsFromGeometry } from './geometry-measure.js';
import { classifyGeometry } from './geometry-classification.js';

function boundsFromNode(node) {
  if (node?.bounds) return node.bounds;
  return node?.geometry?.boundingBox ?? null;
}

export function createComponentProfile(component = {}, index = 0) {
  const dimensions = component.dimensions ?? dimensionsFromGeometry(component.geometry);
  const profile = createGeometryProfile({
    id: component.id ?? `component-${index + 1}`,
    name: component.name,
    source: component.source,
    dimensions,
    center: component.center,
    metadata: component.metadata
  });

  return {
    ...profile,
    type: classifyGeometry({
      meshCount: 1,
      childCount: 1,
      explicitType: component.type
    }),
    bounds: boundsFromNode(component)
  };
}

export function createComponentProfiles(components = []) {
  const list = Array.isArray(components) ? components : [];
  return list.map((component, index) => createComponentProfile(component, index));
}
