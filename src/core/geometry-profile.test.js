import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeometryProfile, updateGeometryProfile } from './geometry-profile.js';

test('creates a complete profile from bounds', () => {
  const profile = createGeometryProfile({
    id: 'pieza-1',
    name: 'Pieza 1',
    source: 'import',
    bounds: { min: { x: -10, y: 2, z: 0 }, max: { x: 30, y: 12, z: 5 } }
  });

  assert.deepEqual(profile.dimensions, { width: 40, height: 10, depth: 5 });
  assert.equal(profile.valid, true);
  assert.equal(profile.volume, 2000);
});

test('normalizes missing identity and source', () => {
  const profile = createGeometryProfile({ dimensions: { width: 2, height: 3, depth: 4 } });
  assert.equal(profile.id, 'model');
  assert.equal(profile.name, 'model');
  assert.equal(profile.source, 'unknown');
});

test('preserves center and metadata', () => {
  const profile = createGeometryProfile({
    dimensions: { width: 10, height: 20, depth: 30 },
    center: { x: 1, y: 2, z: 3 },
    metadata: { format: 'stl' }
  });

  assert.deepEqual(profile.center, { x: 1, y: 2, z: 3 });
  assert.deepEqual(profile.metadata, { format: 'stl' });
});

test('updates a profile through the same normalization rules', () => {
  const profile = createGeometryProfile({ id: 'a', dimensions: { width: 1, height: 1, depth: 1 } });
  const updated = updateGeometryProfile(profile, { dimensions: { width: 5, height: 2, depth: 3 } });

  assert.equal(updated.id, 'a');
  assert.deepEqual(updated.dimensions, { width: 5, height: 2, depth: 3 });
  assert.equal(updated.volume, 30);
});
