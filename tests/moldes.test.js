/** Moldes: dos mitades que no se pisan, con el hueco de la pieza, llaves que encastran y bebedero. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { twoPartMold, siliconeBox } from '../src/tools/mold-core.js';
import { sampleModel } from '../src/tools/split-core.js';

before(async () => { const w = await Module(); w.setup(); setWasm(w); });

test('molde de dos partes: cerradas, sin pisarse y con el volumen de la pieza adentro', () => {
  const m = sampleModel();
  const r = twoPartMold(m, { wall: 8, split: 0.4, pour: 8, vents: 2 });
  for (const s of [r.lower, r.upper]) { assert.equal(s.status(), 'NoError'); assert.equal(s.decompose().filter(x => x.volume() > 0.01).length, 1); }
  // En su lugar (antes de darla vuelta), la de arriba no pisa a la de abajo
  const lowerInPlace = r.lower.translate([0, 0, m.boundingBox().min[2] - 8]);
  assert.ok(lowerInPlace.intersect(r.upperInPlace).volume() < 0.5);
  // Ninguna mitad pisa la pieza
  assert.ok(lowerInPlace.intersect(m).volume() < 0.5 && r.upperInPlace.intersect(m).volume() < 0.5);
  // Apoyadas sobre la cama
  assert.ok(Math.abs(r.lower.boundingBox().min[2]) < 1e-6 && Math.abs(r.upper.boundingBox().min[2]) < 1e-6);
});

test('caja para colar silicona: base, pieza y cuatro paredes', () => {
  const r = siliconeBox(sampleModel(), { margin: 10 });
  assert.equal(r.walls.length, 4);
  assert.ok(r.base.volume() > 100 && r.walls.every(w => w.volume() > 100));
});
