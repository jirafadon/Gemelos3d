/**
 * Contrato de eventos entre el Taller visual y la UI de Fabricación.
 * Mantiene desacoplados el DOM/Three.js y el núcleo puro.
 */

export const TALLER_PLAN_REQUEST = 'gemelos3d:fabrication-plan-request';
export const TALLER_PLAN_RESULT = 'gemelos3d:fabrication-plan-result';

export function createTallerPlanRequest(detail = {}) {
  return new CustomEvent(TALLER_PLAN_REQUEST, {
    detail: { source: 'fabrication-ui', ...detail }
  });
}

export function createTallerPlanResult(plan, detail = {}) {
  return new CustomEvent(TALLER_PLAN_RESULT, {
    detail: { source: 'taller', plan: plan ?? null, ...detail }
  });
}
