import test from 'node:test';
import assert from 'node:assert/strict';
import { createComponentProfile, createComponentProfiles } from './geometry-component-profiles.js';

test('creates a normalized profile for a component', () => {
  const profile = createComponentProfile({
    id: 'base',
    name: 'Base',
    source: 'stl',
    dimensions: { width: 10, height: 20, depth: 30 },
    metadata: { material: 'PLA' }
  });

  assert.equal(profile.id, 'base');
  assert.equal(profile.name, 'Base');
  assert.equal(profile.type, 'piece');
  assert.equal(profile.volume, 6000);
  assert.equal(profile.metadata.material, 'PLA');
});

test('uses geometry bounding box when dimensions are absent', () => {
  const profile = createComponentProfile({
    id: 'cover',
    geometry: {
      boundingBox: {
        min: { x: -2, y: 0, z: -3 },
        max: { x: 8, y: 4, z: 7 }
      }
    }
  });

  assert.deepEqual(profile.dimensions, { width: 10, height: 4, depth: 10 });
  assert.equal(profile.valid, true);
});

test('creates profiles for a component collection', () => {
  const profiles = createComponentProfiles([
    { id: 'a', dimensions: { width: 1, height: 2, depth: 3 } },
    { id: 'b', dimensions: { width: 4, height: 5, depth: 6 } }
  ]);

  assert.deepEqual(profiles.map(item => item.id), ['a', 'b']);
  assert.deepEqual(profiles.map(item => item.type), ['piece', 'piece']);
});
