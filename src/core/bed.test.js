import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBed,
  normalizePurge,
  computeUsefulArea,
  computeKeepout,
  fitsInsideArea,
  placementFits,
  intersectsKeepout
} from './bed.js';

test('normaliza cama y evita dimensiones inválidas', () => {
  const bed = normalizeBed({ width: 0, depth: -20, height: '250', margin: -4 });
  assert.deepEqual(bed, {
    width: 1,
    depth: 1,
    height: 250,
    margin: 0,
    purge: { enabled: true, width: 0, depth: 0, corner: 'tr' }
  });
});

test('normaliza purga desactivada sin inventar dimensiones', () => {
  assert.deepEqual(normalizePurge({ mode: 'none', width: 40, depth: 40 }), {
    enabled: false,
    width: 0,
    depth: 0,
    corner: 'tr'
  });
});

test('el área útil respeta margen pero no descuenta dos veces la purga', () => {
  const area = computeUsefulArea({
    width: 270,
    depth: 270,
    height: 250,
    margin: 5,
    purge: { width: 40, depth: 30, corner: 'tr' }
  });
  assert.equal(area.width, 260);
  assert.equal(area.depth, 260);
  assert.equal(area.x0, -130);
  assert.equal(area.x1, 130);
  assert.equal(area.y0, -130);
  assert.equal(area.y1, 130);
});

test('computeKeepout devuelve la reserva física de purga', () => {
  const keepout = computeKeepout({
    width: 270,
    depth: 270,
    margin: 5,
    purge: { width: 40, depth: 30, corner: 'tr' }
  });
  assert.deepEqual(keepout, { x0: 90, x1: 130, y0: 100, y1: 130 });
});

test('purga mayor que el área conserva una reserva independiente', () => {
  const keepout = computeKeepout({
    width: 100,
    depth: 100,
    margin: 10,
    purge: { width: 200, depth: 200, corner: 'tr' }
  });
  assert.deepEqual(keepout, { x0: -160, x1: 40, y0: -160, y1: 40 });
});

test('valida tamaño y posición de una pieza', () => {
  const area = computeUsefulArea({ width: 270, depth: 270, margin: 5, purge: { mode: 'none' } });
  assert.equal(fitsInsideArea(250, 100, area), true);
  assert.equal(fitsInsideArea(270, 100, area), false);
  assert.equal(placementFits({ x0: -120, y0: -100, x1: 100, y1: 0 }, area), true);
  assert.equal(placementFits({ x0: -130, y0: -130, x1: 131, y1: 0 }, area), false);
});

test('detecta intersección con keepout', () => {
  const keepout = computeKeepout({ width: 270, depth: 270, margin: 5, purge: { width: 40, depth: 40, corner: 'tr' } });
  assert.equal(intersectsKeepout({ x0: 80, y0: 80, x1: 100, y1: 100 }, keepout), true);
  assert.equal(intersectsKeepout({ x0: 40, y0: 40, x1: 80, y1: 80 }, keepout), false);
});
