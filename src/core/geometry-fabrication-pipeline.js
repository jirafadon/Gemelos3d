/**
 * Pipeline puro: componentes geométricos -> piezas -> plan de fabricación.
 * Mantiene la geometría fuera del núcleo de packing.
 */

import { createComponentProfiles } from './geometry-component-profiles.js';
import { geometryProfilesToFabricationPieces } from './geometry-fabrication-adapter.js';
import { createFabricationPlan } from './fabrication-plan.js';

export function createGeometryFabricationPlan(components = [], bed = {}, options = {}) {
  const profiles = createComponentProfiles(Array.isArray(components) ? components : []);
  const pieces = geometryProfilesToFabricationPieces(profiles, options);
  const plan = createFabricationPlan(pieces, bed, options);

  return {
    ...plan,
    geometry: {
      schemaVersion: 1,
      profiles,
      pieces
    }
  };
}
