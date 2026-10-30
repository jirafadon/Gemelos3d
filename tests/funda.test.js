/** Funda de celular: todos los modelos y las opciones principales arman sólidos válidos. */
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC, collect } from '../src/engine/gc.js';
import gen from '../src/generators/funda-celular.js';
import { PHONES } from '../src/generators/phones.js';

let font;
const ctx = { image: async () => (await import('../src/engine/trace.js')).sampleMask(120), font: async () => {
  if (!font) { const b = fs.readFileSync('node_modules/@fontsource/pacifico/files/pacifico-latin-400-normal.woff'); font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return font;
} };
before(async () => { const w = await Module(); w.setup(); enableGC(w); setWasm(w); });
afterEach(() => collect([]));
const base = Object.fromEntries(gen.params.filter(p => p.key).map(p => [p.key, p.default]));

function ok(name, parts, ph) {
  assert.ok(parts.length >= 1, name);
  for (const p of parts) { assert.equal(p.solid.status(), 'NoError', name); assert.ok(p.solid.volume() > 0.5, `${name}/${p.name}`); }
  const b = parts[0].solid.boundingBox();
  assert.ok(Math.abs(b.min[2]) < 0.01, `${name}: apoya en la cama`);
  if (ph && base.print !== 'test') {
    const w = b.max[0] - b.min[0];
    assert.ok(w > ph.w + 2 && w < ph.w + 9, `${name}: ancho ${w.toFixed(1)}`);
  }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(parts[i].solid.intersect(parts[j].solid).volume() < 0.05, `${name}: se pisan`);
  collect([]);
}

test('todos los modelos (lisa)', async () => {
  for (const [model, ph] of Object.entries(PHONES)) ok(model, await gen.build({ ...base, model, pattern: 'none' }, ctx), ph);
});
test('tramas y modos', async () => {
  for (const pattern of ['honey', 'diamonds', 'dots', 'lines', 'waves', 'image']) for (const mode of ['engrave', 'cut', 'inlay']) {
    const parts = await gen.build({ ...base, pattern, mode, text: pattern === 'dots' ? 'Joni' : '' }, ctx);
    ok(`${pattern}/${mode}`, parts);
    if (mode === 'inlay') assert.equal(parts.length, 2, `${pattern}: dos colores`);
  }
});
test('opciones de funda y a medida', async () => {
  for (const o of [{ buttons: 'cut' }, { buttons: 'none', corners: false }, { bottom: 'open', lanyard: true }, { bottom: 'usb', camProtect: false }, { print: 'test' }, { model: 'redmi-note-13' }, { model: 'custom', camSide: 'C' }, { model: 'custom', cEdge: 0, camSide: 'R' }, { model: 'iphone-12', text: 'Hola\nMundo', pattern: 'none' }, { model: 'iphone-17-pro', buttons: 'cut' }, { model: 'galaxy-s26-ultra' }, { model: 'ipad-a16', buttons: 'cut' }, { model: 'ipad-pro-11', print: 'test' }, { model: 'tab-a9-plus', pattern: 'dots', mode: 'cut' }]) {
    ok(JSON.stringify(o), await gen.build({ ...base, ...o }, ctx));
  }
});
