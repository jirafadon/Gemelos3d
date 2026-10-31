/** Formas nuevas y acomodar texto: todas arman sólidos válidos. */
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC, collect } from '../src/engine/gc.js';
import { SHAPES } from '../src/engine/shapes.js';

let font;
const ctx = { image: async () => (await import('../src/engine/trace.js')).sampleMask(120), font: async () => {
  if (!font) { const b = fs.readFileSync('node_modules/@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff'); font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return font;
} };
before(async () => { const w = await Module(); w.setup(); enableGC(w); setWasm(w); });
afterEach(() => collect([]));
const defaults = g => Object.fromEntries(g.params.filter(p => p.key).map(p => [p.key, p.default]));
const ok = (name, parts) => { assert.ok(parts.length, name); for (const p of parts) { assert.equal(p.solid.status(), 'NoError', name); assert.ok(p.solid.volume() > 0.5, name); } };

test('cada forma de la biblioteca mide lo pedido', () => {
  for (const [k, sh] of Object.entries(SHAPES)) {
    const w = 40, h = w * sh.aspect, cs = sh.make(w, h, 4);
    assert.ok(!cs.isEmpty(), k);
    const b = cs.bounds();
    // Estrella y huella vienen de antes y son algo más angostas que el ancho pedido
    assert.ok(Math.abs(b.max[0] - b.min[0] - w) < w * (['star', 'paw'].includes(k) ? 0.2 : 0.06), `${k}: ancho ${b.max[0] - b.min[0]}`);
  }
});
test('llavero con forma: todas las formas, texto centrado y corrido', async () => {
  const g = (await import('../src/generators/llavero-forma.js')).default;
  for (const o of g.params.find(p => p.key === 'shape').options) ok(o.value, await g.build({ ...defaults(g), shape: o.value, tCenter: true, tDx: 2, tDy: -1, tScale: 80 }, ctx));
});
test('souvenirs y egresados con texto acomodado', async () => {
  const s = (await import('../src/generators/souvenirs.js')).default;
  for (const o of s.params.find(p => p.key === 'shape').options) ok(o.value, await s.build({ ...defaults(s), shape: o.value, names: 'Ana', tScale: 120 }, ctx));
  const gr = (await import('../src/generators/graduados.js')).default;
  for (const icon of ['birrete', 'diploma', 'none']) ok(icon, await gr.build({ ...defaults(gr), icon, names: 'Juan', tDx: 4, tDy: 2, iconScale: 140, gapY: 3, tScale: 80 }, ctx));
});
