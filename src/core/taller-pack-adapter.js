import { createFabricationPlan } from './fabrication-plan.js';

/**
 * Adapter puro entre los items visuales del Taller y el plan de fabricación.
 * No modifica objetos Three.js: devuelve un plan aplicable por la UI.
 */
export function buildTallerPackPlan(items = [], bed, options = {}) {
  const measured = items.map((item, index) => ({
    id: item.id ?? `piece-${index + 1}`,
    name: item.name ?? item.char ?? `Pieza ${index + 1}`,
    width: Number(item.width) || 0,
    depth: Number(item.height) || 0,
    source: item.source ?? item.groupId ?? null
  }));
  return createFabricationPlan(measured, bed, options);
}

export function applyTallerPackPlan(items = [], plan) {
  const byId = new Map(items.map(item => [item.id, item]));
  const applied = [];
  for (const [bedIndex, plate] of plan.beds.entries()) {
    for (const placement of plate.items) {
      const item = byId.get(placement.id);
      if (!item) continue;
      applied.push({ item, bed: bedIndex, x: placement.x, y: placement.y, rotation: placement.rotation });
    }
  }
  return { applied, rejected: plan.rejected, complete: plan.summary.complete };
}
