import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFabricationPlanToProject } from './fabrication-project.js';

const project = {
  id: 'p1',
  name: 'Test',
  fabrication: { pieces: [], beds: [], selectedPiece: null, selectedBed: null }
};

const plan = {
  beds: [{ index: 0, items: [{ id: 'a', name: 'A', x: 10, y: 20, rotation: 90, width: 30, depth: 40 }] }],
  rejected: [{ id: 'b', name: 'B', width: 500, depth: 500, reason: 'no-fit' }]
};

test('persiste placements y rechazos como estado serializable', () => {
  const next = applyFabricationPlanToProject(project, plan);
  assert.equal(next.fabrication.beds.length, 1);
  assert.equal(next.fabrication.pieces.length, 2);
  assert.equal(next.fabrication.pieces[0].status, 'placed');
  assert.equal(next.fabrication.pieces[0].rotation, 90);
  assert.equal(next.fabrication.pieces[1].status, 'rejected');
  assert.equal(next.fabrication.pieces[1].reason, 'no-fit');
  assert.equal(next.fabrication.selectedBed, 0);
});
