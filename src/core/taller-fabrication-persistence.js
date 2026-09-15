import { applyFabricationPlanToProject } from './fabrication-project.js';
import { recoverFabricationState } from './fabrication-recovery.js';
import { getOrCreateProject, loadProject, saveProject } from '../project/project-storage.js';

export function persistTallerFabricationPlan(plan) {
  if (!plan) return null;
  const project = getOrCreateProject();
  const next = applyFabricationPlanToProject(project, plan);
  return saveProject(next);
}

export function recoverTallerFabricationState() {
  const project = loadProject();
  return project ? recoverFabricationState(project) : null;
}
