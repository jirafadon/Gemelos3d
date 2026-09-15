import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFabricationItems, isKnownFabricationRejectReason } from './fabrication-validation.js';

test('rechaza dimensiones cero, negativas y no finitas', () => {
  const result = validateFabricationItems([
    { id: 'ok', width: 20, depth: 10 },
    { id: 'zero', width: 0, depth: 10 },
    { id: 'negative', width: 10, depth: -2 },
    { id: 'nan', width: Number.NaN, depth: 5 }
  ]);
  assert.equal(result.valid.length, 1);
  assert.equal(result.rejected.length, 3);
  assert.ok(result.rejected.every(item => item.reason === 'invalid-dimensions'));
});

test('rechaza IDs duplicados para evitar perder piezas en el mapeo', () => {
  const result = validateFabricationItems([
    { id: 'A', width: 20, depth: 10 },
    { id: 'A', width: 30, depth: 10 }
  ]);
  assert.equal(result.valid.length, 1);
  assert.equal(result.rejected[0].reason, 'duplicate-id');
});

test('asigna IDs deterministas cuando faltan', () => {
  const result = validateFabricationItems([
    { width: 10, depth: 10 },
    { width: 12, depth: 12 }
  ]);
  assert.deepEqual(result.valid.map(item => item.id), ['piece-1', 'piece-2']);
});

test('reconoce todos los rechazos de fabricación esperados', () => {
  assert.equal(isKnownFabricationRejectReason('invalid-dimensions'), true);
  assert.equal(isKnownFabricationRejectReason('duplicate-id'), true);
  assert.equal(isKnownFabricationRejectReason('no-fit'), true);
  assert.equal(isKnownFabricationRejectReason('unknown'), false);
});
