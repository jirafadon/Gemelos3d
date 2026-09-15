/**
 * Adaptador entre los objetos del Taller y el planificador puro.
 * No toca Three.js: recibe mediciones ya calculadas y devuelve un plan.
 */

import { createFabricationPlan } from './fabrication-plan.js';

export function measurePackingItem(item, index = 0) {
  const width = Math.max(0, Number(item.width) || 0);
  const depth = Math.max(0, Number(item.depth ?? item.height) || 0);

  return {
    id: item.id ?? `piece-${index + 1}`,
    name: item.name ?? item.char ?? item.id ?? `Pieza ${index + 1}`,
    width,
    depth,
    source: item.source ?? null
  };
}

export function createLivePackingPlan(items, bed, options = {}) {
  return createFabricationPlan(
    (items ?? []).map(measurePackingItem),
    bed,
    options
  );
}

export function applyPackingPlan(plan, items = []) {
  const byId = new Map(items.map(item => [item.id, item]));
  const placed = [];

  for (const plate of plan.beds) {
    for (const placement of plate.items) {
      const item = byId.get(placement.id);
      if (!item) continue;
      placed.push({
        item,
        bed: plate.index,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        depth: placement.depth,
        rotation: placement.rotation
      });
    }
  }

  return {
    placed,
    rejected: plan.rejected,
    summary: plan.summary
  };
}
