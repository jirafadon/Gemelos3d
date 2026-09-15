import { createFabricationPlan } from './fabrication-plan.js';
import { applyFabricationPlanToProject } from './fabrication-project.js';
import { recoverFabricationState } from './fabrication-recovery.js';

/**
 * Punto único del núcleo: mide piezas ya normalizadas, planifica y deja
 * preparado el estado persistible. No toca DOM ni Three.js.
 */
export function buildFabricationPipeline(items = [], bed, options = {}, project = null) {
  const plan = createFabricationPlan(items, bed, options);
  const nextProject = project ? applyFabricationPlanToProject(project, plan) : null;
  const recovery = nextProject ? recoverFabricationState(nextProject) : null;

  return { plan, project: nextProject, recovery };
}
