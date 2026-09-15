import test from 'node:test';
import assert from 'node:assert/strict';
import { planTaller, placementsForTaller } from './taller-integration-bridge.js';

test('el puente devuelve placements listos para la UI', () => {
  const result = planTaller(
    [{ id: 'a', width: 80, depth: 40 }],
    { width: 220, depth: 220, height: 250, margin: 5, purge: { width: 0, depth: 0 } },
    { gap: 4 }
  );

  const placements = placementsForTaller(result);
  assert.equal(placements.length, 1);
  assert.equal(placements[0].id, 'a');
  assert.equal(placements[0].bed, 0);
  assert.equal(typeof placements[0].x, 'number');
  assert.equal(typeof placements[0].y, 'number');
  assert.equal(typeof placements[0].rotation, 'number');
});
