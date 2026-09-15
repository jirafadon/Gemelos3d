import test from 'node:test';
import assert from 'node:assert/strict';
import { measureBoundsCollection, measureObjectHierarchy, measureObjectCollection } from './object-measure.js';

const bounds = (min, max) => ({ min, max });

test('merges multiple bounds into one measurement', () => {
  const result = measureBoundsCollection([
    bounds({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }),
    bounds({ x: -5, y: 4, z: 2 }, { x: 15, y: 25, z: 40 })
  ]);
  assert.deepEqual(result, { width: 20, height: 25, depth: 40 });
});

test('measures a complete hierarchy recursively', () => {
  const root = {
    bounds: bounds({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }),
    children: [
      { bounds: bounds({ x: -5, y: 2, z: 1 }, { x: 5, y: 12, z: 8 }), children: [] },
      { bounds: bounds({ x: 8, y: -3, z: -2 }, { x: 20, y: 4, z: 6 }), children: [] }
    ]
  };
  const result = measureObjectHierarchy(root, node => node.bounds);
  assert.deepEqual(result, { width: 25, height: 15, depth: 12 });
});

test('measures a collection without hierarchy traversal', () => {
  const objects = [
    { bounds: bounds({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }) },
    { bounds: bounds({ x: 10, y: 5, z: -2 }, { x: 25, y: 15, z: 8 }) }
  ];
  assert.deepEqual(measureObjectCollection(objects, node => node.bounds), {
    width: 25,
    height: 15,
    depth: 12
  });
});

test('returns zero dimensions when no usable bounds exist', () => {
  assert.deepEqual(measureBoundsCollection([]), { width: 0, height: 0, depth: 0 });
  assert.deepEqual(measureObjectHierarchy(null, () => null), { width: 0, height: 0, depth: 0 });
});
