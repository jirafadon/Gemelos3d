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

test('sin purga, área útil respeta margen', () => {
  const area = computeUsefulArea({ width: 270, depth: 270, height: 250, margin: 5, purge: { mode: 'none' } });
  assert.equal(area.width, 260);
  assert.equal(area.depth, 260);
  assert.equal(area.x0, -130);
  assert.equal(area.x1, 130);
});

test('la purga recorta la esquina correcta del área útil', () => {
  const area = computeUsefulArea({
    width: 270,
    depth: 270,
    margin: 5,
    purge: { width: 40, depth: 30, corner: 'tr' }
  });
  assert.equal(area.width, 220);
  assert.equal(area.depth, 230);
  assert.equal(area.x1, 90);
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

test('purga mayor que el área no produce dimensiones negativas', () => {
  const area = computeUsefulArea({
    width: 100,
    depth: 100,
    margin: 10,
    purge: { width: 200, depth: 200, corner: 'tr' }
  });
  assert.equal(area.width, 0);
  assert.equal(area.depth, 0);
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
