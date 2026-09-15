import test from 'node:test';
import assert from 'node:assert/strict';
import { createFabricationPlan } from './fabrication-plan.js';

const bed = { width: 220, depth: 220, height: 250, margin: 5, purge: { width: 40, depth: 40 } };

test('integra purga + packing + rotación + resumen', () => {
  const plan = createFabricationPlan([
    { id: 'wide', width: 180, depth: 40 },
    { id: 'rot', width: 40, depth: 120 },
    { id: 'small', width: 50, depth: 50 }
  ], bed, { gap: 4 });

  assert.equal(plan.summary.requested, 3);
  assert.equal(plan.summary.placed, 3);
  assert.equal(plan.summary.rejected, 0);
  assert.equal(plan.summary.complete, true);
  assert.ok(plan.beds.length >= 1);
});

test('mueve piezas a una segunda cama cuando la primera no alcanza', () => {
  const plan = createFabricationPlan([
    { id: 'a', width: 205, depth: 150 },
    { id: 'b', width: 205, depth: 150 }
  ], { width: 220, depth: 220, margin: 5, purge: { width: 0, depth: 0 } }, { gap: 4 });

  assert.equal(plan.summary.placed, 2);
  assert.equal(plan.summary.rejected, 0);
  assert.equal(plan.beds.length, 2);
});

test('conserva rechazo imposible sin perderlo', () => {
  const plan = createFabricationPlan([
    { id: 'ok', width: 50, depth: 50 },
    { id: 'impossible', width: 300, depth: 300 }
  ], bed, { gap: 4 });

  assert.equal(plan.summary.requested, 2);
  assert.equal(plan.summary.placed, 1);
  assert.equal(plan.summary.rejected, 1);
  assert.equal(plan.summary.complete, true);
  assert.equal(plan.rejected[0].id, 'impossible');
});
