import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTallerPackPlan, applyTallerPackPlan } from './taller-pack-adapter.js';

const bed = { width: 220, depth: 220, height: 250, margin: 5, purge: { width: 40, depth: 40 } };

test('adapta items del Taller al planificador', () => {
  const plan = buildTallerPackPlan([
    { id: 'a', width: 80, height: 40 },
    { id: 'b', width: 60, height: 50 }
  ], bed, { gap: 4 });
  assert.equal(plan.summary.requested, 2);
  assert.equal(plan.summary.placed, 2);
  assert.equal(plan.summary.rejected, 0);
});

test('aplica placements sin perder rechazos', () => {
  const items = [{ id: 'a', width: 80, height: 40 }];
  const plan = buildTallerPackPlan(items, bed, { gap: 4 });
  const result = applyTallerPackPlan(items, plan);
  assert.equal(result.applied.length, 1);
  assert.equal(result.complete, true);
});
