import { updateProject } from '../project/project-state.js';

/**
 * Convierte un plan de fabricación en estado persistible del proyecto.
 * Mantiene la geometría fuera del estado: solo guarda datos serializables.
 */
export function applyFabricationPlanToProject(project, plan) {
  return updateProject(project, {
    fabrication: {
      pieces: plan.beds.flatMap((bed, bedIndex) => bed.items.map(item => ({
        id: item.id,
        name: item.name,
        bed: bedIndex,
        x: item.x,
        y: item.y,
        rotation: item.rotation,
        width: item.width,
        depth: item.depth,
        status: 'placed'
      })).concat([])).concat(
        plan.rejected.map(item => ({
          id: item.id,
          name: item.name,
          width: item.width,
          depth: item.depth,
          status: 'rejected',
          reason: item.reason
        }))
      ),
      beds: plan.beds.map((bed, index) => ({
        index,
        items: bed.items.map(item => item.id)
      })),
      selectedPiece: null,
      selectedBed: 0
    }
  });
}
