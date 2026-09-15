import { createGeometryFabricationPlan } from './geometry-fabrication-pipeline.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runGeometryFabricationPipelineTests() {
  const plan = createGeometryFabricationPlan([
    { id: 'a', name: 'A', isMesh: true, geometry: { boundingBox: {
      min: { x: 0, y: 0, z: 0 }, max: { x: 20, y: 5, z: 30 }
    } } },
    { id: 'b', name: 'B', isMesh: true, geometry: { boundingBox: {
      min: { x: 0, y: 0, z: 0 }, max: { x: 40, y: 8, z: 10 }
    } } }
  ], { width: 100, depth: 100, margin: 0, purge: 0 });

  assert(plan.geometry.profiles.length === 2, 'creates component profiles');
  assert(plan.geometry.pieces.length === 2, 'creates fabrication pieces');
  assert(plan.geometry.pieces[0].width === 20, 'maps width');
  assert(plan.geometry.pieces[0].depth === 30, 'maps depth');
  assert(plan.summary.requested === 2, 'plan receives all pieces');
  assert(plan.summary.placed === 2, 'fits both pieces');
  assert(plan.summary.complete === true, 'plan is complete');
  assert(plan.beds[0].items.length === 2, 'placements are generated');

  return true;
}
