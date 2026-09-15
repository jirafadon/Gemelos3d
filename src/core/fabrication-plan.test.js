import test from 'node:test';
import assert from 'node:assert/strict';
import { createFabricationPlan } from './fabrication-plan.js';

test('el plan conserva todas las piezas entre colocadas y rechazadas', () => {
  const plan = createFabricationPlan([
    { id: 'A', name: 'Letra A', width: 100, depth: 80, source: 'word' },
    { id: 'B', name: 'Letra B', width: 500, depth: 500, source: 'word' }
  ], {
    width: 220,
    depth: 220,
    height: 250,
    margin: 5,
    purge: { mode: 'none' }
  });

  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.summary.requested, 2);
  assert.equal(plan.summary.placed, 1);
  assert.equal(plan.summary.rejected, 1);
  assert.equal(plan.summary.complete, true);
  assert.equal(plan.rejected[0].id, 'B');
  assert.equal(plan.beds[0].items[0].id, 'A');
});

test('el plan conserva rotación y coordenadas de fabricación', () => {
  const plan = createFabricationPlan([
    { id: 'A', width: 120, depth: 100 }
  ], {
    width: 120,
    depth: 270,
    height: 250,
    margin: 5,
    purge: { mode: 'none' }
  });

  const piece = plan.beds[0].items[0];
  assert.equal(piece.rotation, 90);
  assert.equal(piece.width, 100);
  assert.equal(piece.depth, 120);
  assert.equal(typeof piece.x, 'number');
  assert.equal(typeof piece.y, 'number');
});
