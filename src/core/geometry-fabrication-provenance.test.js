import {
  createGeometryProvenance,
  buildGeometryProvenanceMap,
  attachGeometryProvenance,
  recoverGeometryProvenance
} from './geometry-fabrication-provenance.js';

const profile = {
  schemaVersion: 1,
  id: 'motor-a',
  name: 'Motor A',
  source: 'imported-model',
  type: 'piece',
  dimensions: { width: 10, height: 20, depth: 30 }
};

const piece = {
  id: 'motor-a',
  name: 'Motor A',
  source: 'geometry',
  geometryType: 'piece'
};

const plan = { geometry: { profiles: [profile], pieces: [piece] } };

test('creates provenance including a geometry version', () => {
  const provenance = createGeometryProvenance(profile, piece);
  expect(provenance.geometryId).toBe('motor-a');
  expect(provenance.geometryVersion.signature).toBe('motor-a|imported-model|piece|10|20|30');
});

test('builds provenance keyed by fabrication piece id', () => {
  expect(buildGeometryProvenanceMap(plan)['motor-a'].geometryId).toBe('motor-a');
});

test('persists provenance without geometry objects', () => {
  const project = { id: 'project-1', fabrication: { pieces: [{ id: 'motor-a' }] } };
  const next = attachGeometryProvenance(project, plan);
  expect(next.fabrication.geometryProvenance['motor-a'].geometryName).toBe('Motor A');
  expect(next.fabrication.geometryProvenance['motor-a'].geometry).toBeUndefined();
});

test('recovers a serializable provenance snapshot', () => {
  const project = attachGeometryProvenance({ fabrication: {} }, plan);
  expect(recoverGeometryProvenance(project)).toEqual(project.fabrication.geometryProvenance);
});
