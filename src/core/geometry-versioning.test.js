import { createGeometryVersion, geometryVersionMatches, compareGeometryVersion } from './geometry-versioning.js';

test('creates a deterministic version from geometry identity and dimensions', () => {
  const version = createGeometryVersion({
    id: 'g1', source: 'imported-model', type: 'piece',
    dimensions: { width: 10, height: 20, depth: 30 }
  });
  expect(version.schemaVersion).toBe(1);
  expect(version.geometryId).toBe('g1');
  expect(version.signature).toBe('g1|imported-model|piece|10|20|30');
});

test('detects unchanged and changed geometry', () => {
  const profile = { id: 'g1', source: 'imported-model', type: 'piece', dimensions: { width: 10, height: 20, depth: 30 } };
  const version = createGeometryVersion(profile);
  expect(geometryVersionMatches(profile, version)).toBe(true);
  expect(compareGeometryVersion(profile, version)).toBe('current');
  expect(compareGeometryVersion({ ...profile, dimensions: { ...profile.dimensions, width: 11 } }, version)).toBe('changed');
});

test('reports unknown when no stored version exists', () => {
  expect(compareGeometryVersion({ id: 'g1' }, null)).toBe('unknown');
});
