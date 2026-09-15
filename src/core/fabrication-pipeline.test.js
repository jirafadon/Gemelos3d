import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFabricationPipeline } from './fabrication-pipeline.js';

test('cierra el ciclo plan -> proyecto -> recuperación', () => {
  const project = {
    id: 'p1',
    name: 'Pipeline',
    schemaVersion: 2,
    fabrication: { pieces: [], beds: [], selectedPiece: null, selectedBed: null }
  };

  const result = buildFabricationPipeline(
    [
      { id: 'a', width: 80, depth: 40 },
      { id: 'b', width: 30, depth: 30 }
    ],
    { width: 220, depth: 220, height: 250, margin: 5, purge: { width: 40, depth: 40 } },
    { gap: 4 },
    project
  );

  assert.equal(result.plan.summary.requested, 2);
  assert.equal(result.plan.summary.placed, 2);
  assert.equal(result.plan.summary.complete, true);
  assert.equal(result.recovery.placed.length, 2);
  assert.equal(result.recovery.rejected.length, 0);
  assert.equal(result.recovery.complete, true);
});
