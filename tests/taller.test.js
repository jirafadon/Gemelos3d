import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC } from '../src/engine/gc.js';
import { toSTL, solidToTriangles, to3MF } from '../src/engine/export.js';
import { TYPES, makeObject, objectSolid, sceneParts, parseSTLMesh, meshToManifold } from '../src/taller/objects.js';
import { sampleMask } from '../src/engine/trace.js';

let ctx;
before(async () => {
  const w = await Module(); w.setup(); enableGC(w); setWasm(w);
  const b = fs.readFileSync('node_modules/@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff');
  const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  ctx = { font: async () => font, image: async () => sampleMask(100) };
});

for (const type of Object.keys(TYPES).filter(t => t !== 'stl')) {
  test(`objeto ${type}: tamaño, posición y base en Z`, async () => {
    const o = makeObject(type, 0, { x: 10, y: -5, z: 2 });
    const s = await objectSolid(o, ctx);
    assert.equal(s.status(), 'NoError');
    assert.ok(s.volume() > 1);
    const b = s.boundingBox();
    assert.ok(Math.abs(b.min[2] - 2) < 0.01, 'la base queda en Z');
    assert.ok(Math.abs((b.min[0] + b.max[0]) / 2 - 10) < 0.01 && Math.abs((b.min[1] + b.max[1]) / 2 + 5) < 0.01, 'centrado en X/Y');
    if (!['text', 'image'].includes(type)) {
      assert.ok(Math.abs((b.max[0] - b.min[0]) - o.w) < 0.3, `ancho ${b.max[0] - b.min[0]}`);
      assert.ok(Math.abs((b.max[2] - b.min[2]) - o.h) < 0.3, `alto ${b.max[2] - b.min[2]}`);
    }
  });
}

test('rotación respeta la base en Z', async () => {
  const s = await objectSolid(makeObject('box', 0, { rx: 30, rz: 45, z: 0 }), ctx);
  assert.ok(Math.abs(s.boundingBox().min[2]) < 0.01);
});

test('los huecos restan y los colores no se pisan', async () => {
  const a = makeObject('box', 0, { w: 30, d: 30, h: 10, color: '#FF0000' });
  const b = makeObject('cylinder', 1, { w: 10, d: 10, h: 20, hole: true });
  const c = makeObject('box', 2, { x: 10, w: 20, d: 10, h: 12, color: '#00FF00' });
  const solids = new Map();
  for (const o of [a, b, c]) solids.set(o.id, await objectSolid(o, ctx));
  const parts = sceneParts([a, b, c], solids);
  assert.equal(parts.length, 2);
  const red = parts.find(p => p.color === '#FF0000').solid;
  assert.ok(red.volume() < 30 * 30 * 10 - Math.PI * 25 * 10 * 0.9, 'el hueco se restó');
  assert.ok(parts[0].solid.intersect(parts[1].solid).volume() < 0.01, 'sin superposición entre colores');
  assert.ok(to3MF(parts).length > 500);
});

test('importa un STL, lo convierte en sólido y lo escala', async () => {
  const { Manifold } = (await import('../src/engine/geom.js')).wasm();
  const cube = Manifold.cube([10, 20, 30]);
  const stl = toSTL([solidToTriangles(cube)]);
  const mesh = parseSTLMesh(stl.buffer.slice(stl.byteOffset, stl.byteOffset + stl.byteLength));
  assert.equal(meshToManifold(mesh).status(), 'NoError');
  const s = await objectSolid(makeObject('stl', 0, { mesh, w: 20, d: 40, h: 60 }), ctx);
  const b = s.boundingBox();
  assert.ok(Math.abs(b.max[0] - b.min[0] - 20) < 0.01 && Math.abs(b.max[2] - b.min[2] - 60) < 0.01);
});
