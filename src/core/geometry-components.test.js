import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGeometryComponents, extractComponentsFromHierarchy } from './geometry-components.js';

test('extracts mesh components preserving order', () => {
  const result = extractGeometryComponents([
    { id: 'a', name: 'Base', isMesh: true },
    { id: 'group', children: [] },
    { id: 'b', name: 'Tapa', type: 'Mesh' }
  ]);

  assert.deepEqual(result.map(item => item.id), ['a', 'b']);
  assert.deepEqual(result.map(item => item.name), ['Base', 'Tapa']);
});

test('generates deterministic ids when a mesh has no id', () => {
  const result = extractGeometryComponents([{ isMesh: true }, { geometry: {} }], { idPrefix: 'part' });
  assert.deepEqual(result.map(item => item.id), ['part-1', 'part-2']);
});

test('walks a nested hierarchy', () => {
  const result = extractComponentsFromHierarchy({
    name: 'Root',
    children: [
      { name: 'A', isMesh: true },
      { children: [{ name: 'B', geometry: {} }] }
    ]
  });

  assert.deepEqual(result.map(item => item.name), ['A', 'B']);
});

test('returns an empty list for invalid input', () => {
  assert.deepEqual(extractGeometryComponents(null), []);
  assert.deepEqual(extractComponentsFromHierarchy(null), []);
});
