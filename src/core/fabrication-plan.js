/**
 * Contrato serializable entre geometría medida y el plan de fabricación.
 * No depende de Three.js ni del DOM.
 */

import { normalizeBed } from './bed.js';
import { packPieces } from './pack.js';
import { validateFabricationItems } from './fabrication-validation.js';

export function createFabricationPlan(items = [], bedInput = {}, options = {}) {
  const validation = validateFabricationItems(items);
  const bed = normalizeBed(bedInput);
  const result = packPieces(validation.valid, bed, options);
  const placed = result.beds.flatMap(b => b.items);
  const rejected = [
    ...validation.rejected,
    ...result.rejected.map(({ item, reason }) => ({
      id: item.id,
      name: item.name,
      width: item.width,
      depth: item.depth,
      reason
    }))
  ];

  return {
    schemaVersion: 1,
    bed,
    gap: Math.max(0, Number(options.gap) || 0),
    beds: result.beds.map((plate, index) => ({
      index,
      items: plate.items.map(item => ({
        id: item.id,
        name: item.name,
        source: item.source,
        rotation: item.rotation,
        x: item.x,
        y: item.y,
        width: item.width,
        depth: item.depth
      }))
    })),
    rejected,
    summary: {
      requested: items.length,
      placed: placed.length,
      rejected: rejected.length,
      beds: result.beds.length,
      complete: placed.length + rejected.length === items.length
    }
  };
}
