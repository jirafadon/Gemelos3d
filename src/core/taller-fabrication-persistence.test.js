import test from 'node:test';
import assert from 'node:assert/strict';
import { createFabricationPlan } from './fabrication-plan.js';
import { persistTallerFabricationPlan, recoverTallerFabricationState } from './taller-fabrication-persistence.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
}

test('persiste un plan del Taller y lo recupera completo', () => {
  globalThis.localStorage = createMemoryStorage();
  const plan = createFabricationPlan([
    { id: 'piece-a', name: 'Pieza A', width: 80, depth: 40 },
    { id: 'piece-b', name: 'Pieza B', width: 300, depth: 300 }
  ], { width: 220, depth: 220, height: 250, margin: 5, purge: { width: 0, depth: 0 } }, { gap: 4 });

  const saved = persistTallerFabricationPlan(plan);
  const recovered = recoverTallerFabricationState();

  assert.ok(saved?.id);
  assert.equal(recovered.complete, true);
  assert.equal(recovered.pieces.length, 2);
  assert.equal(recovered.placed.length, 1);
  assert.equal(recovered.rejected.length, 1);
  assert.equal(recovered.rejected[0].id, 'piece-b');
  assert.equal(recovered.beds.length, 1);
  assert.deepEqual(recovered.beds[0].items, ['piece-a']);
});

test('la recuperación es segura cuando no existe proyecto guardado', () => {
  globalThis.localStorage = createMemoryStorage();
  assert.equal(recoverTallerFabricationState(), null);
});
