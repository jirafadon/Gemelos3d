import test from 'node:test';
import assert from 'node:assert/strict';
import { measurePackingItem, createLivePackingPlan, applyPackingPlan } from './live-packing-adapter.js';

test('adapta una pieza del Taller a medidas de fabricación', () => {
  assert.deepEqual(measurePackingItem({ id: 'A', char: 'A', width: 80, height: 50 }), {
    id: 'A', name: 'A', width: 80, depth: 50, source: null
  });
});

test('genera un plan completo para piezas del Taller', () => {
  const plan = createLivePackingPlan([
    { id: 'A', width: 80, height: 50 },
    { id: 'B', width: 70, height: 50 }
  ], {
    width: 200, depth: 200, height: 250, margin: 5,
    purge: { mode: 'none' }
  }, { gap: 4 });

  assert.equal(plan.summary.requested, 2);
  assert.equal(plan.summary.placed, 2);
  assert.equal(plan.summary.rejected, 0);
  assert.equal(plan.summary.complete, true);
});

test('aplica el resultado solo a piezas existentes y conserva rechazos', () => {
  const plan = createLivePackingPlan([
    { id: 'ok', width: 80, height: 50 },
    { id: 'bad', width: 500, height: 500 }
  ], {
    width: 200, depth: 200, height: 250, margin: 5,
    purge: { mode: 'none' }
  });

  const result = applyPackingPlan(plan, [{ id: 'ok' }]);
  assert.equal(result.placed.length, 1);
  assert.equal(result.placed[0].item.id, 'ok');
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].id, 'bad');
});
