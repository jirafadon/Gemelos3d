import { createGeometryFabricationPlan } from './geometry-fabrication-pipeline.js';
import { applyFabricationPlanToProject } from './fabrication-project.js';
import { recoverFabricationState } from './fabrication-recovery.js';

/**
 * Integra el pipeline geométrico con el estado persistible del proyecto.
 * La geometría se usa para planificar; el proyecto conserva solo datos serializables.
 */
export function buildGeometryFabricationProject(components = [], bed = {}, options = {}, project = null) {
  const plan = createGeometryFabricationPlan(components, bed, options);
  const nextProject = project ? applyFabricationPlanToProject(project, plan) : null;
  const recovery = nextProject ? recoverFabricationState(nextProject) : null;

  return { plan, project: nextProject, recovery };
}
