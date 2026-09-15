import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverFabricationState } from './fabrication-recovery.js';

test('recupera fabricación persistida sin depender de UI', () => {
  const state = recoverFabricationState({
    id: 'p1',
    name: 'Demo',
    schemaVersion: 2,
    fabrication: {
      beds: [{ index: 0, items: ['a'] }, { index: 1, items: ['b'] }],
      pieces: [
        { id: 'a', status: 'placed', bed: 0, x: 10, y: 20, rotation: 0 },
        { id: 'b', status: 'rejected', reason: 'no-fit' }
      ],
      selectedPiece: 'a',
      selectedBed: 1
    }
  });

  assert.equal(state.beds.length, 2);
  assert.equal(state.placed.length, 1);
  assert.equal(state.rejected.length, 1);
  assert.equal(state.selectedPiece, 'a');
  assert.equal(state.selectedBed, 1);
  assert.equal(state.complete, true);
});

test('tolera estado antiguo o incompleto', () => {
  const state = recoverFabricationState({ id: 'legacy', name: 'Legacy' });
  assert.deepEqual(state.beds, []);
  assert.deepEqual(state.pieces, []);
  assert.equal(state.selectedBed, 0);
  assert.equal(state.complete, true);
});
