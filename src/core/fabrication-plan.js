/**
 * Contrato serializable entre geometría medida y el plan de fabricación.
 * No depende de Three.js ni del DOM.
 */

import { normalizeBed } from './bed.js';
import { packPieces } from './pack.js';

export function createFabricationPlan(items = [], bedInput = {}, options = {}) {
  const bed = normalizeBed(bedInput);
  const normalized = items.map((item, index) => ({
    id: item.id ?? `piece-${index + 1}`,
    name: item.name ?? item.id ?? `Pieza ${index + 1}`,
    width: Math.max(0, Number(item.width) || 0),
    depth: Math.max(0, Number(item.depth) || 0),
    source: item.source ?? null
  }));

  const result = packPieces(normalized, bed, options);
  const placed = result.beds.flatMap(b => b.items);

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
    rejected: result.rejected.map(({ item, reason }) => ({
      id: item.id,
      name: item.name,
      width: item.width,
      depth: item.depth,
      reason
    })),
    summary: {
      requested: normalized.length,
      placed: placed.length,
      rejected: result.rejected.length,
      beds: result.beds.length,
      complete: placed.length + result.rejected.length === normalized.length
    }
  };
}
