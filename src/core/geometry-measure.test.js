import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dimensionsFromBounds,
  dimensionsFromBoundingBox,
  dimensionsFromGeometry
} from './geometry-measure.js';

test('converts bounds into normalized millimeter dimensions', () => {
  assert.deepEqual(
    dimensionsFromBounds({
      min: { x: -10, y: 5, z: -2 },
      max: { x: 40, y: 85, z: 18 }
    }),
    { width: 50, height: 80, depth: 20 }
  );
});

test('handles reversed bounds safely', () => {
  assert.deepEqual(
    dimensionsFromBoundingBox({
      min: { x: 40, y: 85, z: 18 },
      max: { x: -10, y: 5, z: -2 }
    }),
    { width: 50, height: 80, depth: 20 }
  );
});

test('computes missing geometry bounding box before measuring', () => {
  let computed = 0;
  const geometry = {
    computeBoundingBox() {
      computed += 1;
      this.boundingBox = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 12, y: 34, z: 56 }
      };
    }
  };

  assert.deepEqual(dimensionsFromGeometry(geometry), {
    width: 12,
    height: 34,
    depth: 56
  });
  assert.equal(computed, 1);
});

test('returns zero dimensions for missing geometry', () => {
  assert.deepEqual(dimensionsFromGeometry(null), {
    width: 0,
    height: 0,
    depth: 0
  });
});
