import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMillimeters, isValidDimensions, measureBox, normalizeDimensions } from './measure.js';

test('normaliza dimensiones a milímetros no negativos', () => {
  assert.deepEqual(normalizeDimensions({ width: '120', height: -4, depth: '30.5' }), {
    width: 120,
    height: 0,
    depth: 30.5
  });
});

test('valida una caja tridimensional completa', () => {
  assert.equal(isValidDimensions({ width: 10, height: 20, depth: 30 }), true);
  assert.equal(isValidDimensions({ width: 10, height: 0, depth: 30 }), false);
});

test('measureBox devuelve dimensiones serializables', () => {
  assert.deepEqual(measureBox({ width: 80, height: 60, depth: 12 }), {
    width: 80,
    height: 60,
    depth: 12
  });
});

test('formatea medidas sin depender del DOM', () => {
  assert.equal(formatMillimeters(12.345, 1), '12.3 mm');
});
