import { buildFabricationPipeline } from './fabrication-pipeline.js';

/**
 * Puente pequeño y explícito para que el Taller visual consuma el núcleo sin
 * conocer su implementación interna. La UI puede llamar a planTaller().
 */
export function planTaller(items, bed, options = {}, project = null) {
  return buildFabricationPipeline(items, bed, options, project);
}

export function placementsForTaller(result) {
  return result.plan.beds.flatMap((bed, bedIndex) =>
    bed.items.map(item => ({
      id: item.id,
      bed: bedIndex,
      x: item.x,
      y: item.y,
      rotation: item.rotation
    }))
  );
}
