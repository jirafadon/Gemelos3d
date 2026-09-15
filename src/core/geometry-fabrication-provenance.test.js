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
  type: 'piece'
};

const piece = {
  id: 'motor-a',
  name: 'Motor A',
  source: 'geometry',
  geometryType: 'piece'
};

const plan = { geometry: { profiles: [profile], pieces: [piece] } };

test('creates deterministic provenance from profile and piece', () => {
  expect(createGeometryProvenance(profile, piece)).toEqual({
    geometryId: 'motor-a',
    geometryName: 'Motor A',
    geometrySource: 'imported-model',
    geometryType: 'piece',
    profileSchemaVersion: 1
  });
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
