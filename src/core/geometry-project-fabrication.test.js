import { buildGeometryFabricationProject } from './geometry-project-fabrication.js';
import { createProject } from '../project/project-state.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runGeometryProjectFabricationTests() {
  const project = createProject({ name: 'Geométrico' });
  const result = buildGeometryFabricationProject([
    { id: 'pieza-a', name: 'Pieza A', isMesh: true, geometry: { boundingBox: {
      min: { x: 0, y: 0, z: 0 }, max: { x: 20, y: 5, z: 30 }
    } } }
  ], { width: 100, depth: 100, margin: 0, purge: 0 }, {}, project);

  assert(result.plan.geometry.profiles.length === 1, 'keeps geometry profile');
  assert(result.project.fabrication.pieces.length === 1, 'persists fabrication piece');
  assert(result.project.fabrication.pieces[0].id === 'pieza-a', 'preserves piece id');
  assert(result.recovery.placed.length === 1, 'recovers placed piece');
  assert(result.recovery.complete === true, 'recovered state is complete');

  return true;
}
