import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TALLER_PLAN_REQUEST,
  TALLER_PLAN_RESULT,
  createTallerPlanRequest,
  createTallerPlanResult
} from './taller-fabrication-events.js';

test('crea una solicitud de planificación con origen de UI', () => {
  const event = createTallerPlanRequest({ bed: { width: 220, depth: 220 } });

  assert.equal(event.type, TALLER_PLAN_REQUEST);
  assert.equal(event.detail.source, 'fabrication-ui');
  assert.deepEqual(event.detail.bed, { width: 220, depth: 220 });
});

test('crea un resultado de planificación con origen de Taller', () => {
  const plan = { summary: { requested: 2, placed: 2, rejected: 0, complete: true } };
  const event = createTallerPlanResult(plan);

  assert.equal(event.type, TALLER_PLAN_RESULT);
  assert.equal(event.detail.source, 'taller');
  assert.deepEqual(event.detail.plan, plan);
});
