import { buildTallerPackPlan, applyTallerPackPlan } from './taller-pack-adapter.js';

/**
 * Puente entre el estado visual del Taller y el núcleo puro de fabricación.
 * No toca DOM ni Three.js: la UI decide cuándo y cómo aplicar el resultado.
 */
export function planTallerFabrication(items = [], bed, options = {}) {
  return buildTallerPackPlan(items, bed, options);
}

export function applyTallerFabricationPlan(items = [], plan) {
  return applyTallerPackPlan(items, plan);
}

export function summarizeTallerFabrication(plan) {
  const summary = plan?.summary ?? {};
  return {
    requested: Number(summary.requested) || 0,
    placed: Number(summary.placed) || 0,
    rejected: Number(summary.rejected) || 0,
    beds: Number(summary.beds) || 0,
    complete: summary.complete === true
  };
}
