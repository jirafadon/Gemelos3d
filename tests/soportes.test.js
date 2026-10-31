/** Soportes de celular: todos los estilos, tramas y detalles arman sólidos válidos y sin pisarse. */
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC, collect } from '../src/engine/gc.js';
import gen from '../src/generators/soporte-celular.js';

let font;
const ctx = { image: async () => (await import('../src/engine/trace.js')).sampleMask(120), font: async () => {
  if (!font) { const b = fs.readFileSync('node_modules/@fontsource/pacifico/files/pacifico-latin-400-normal.woff'); font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return font;
} };
before(async () => { const w = await Module(); w.setup(); enableGC(w); setWasm(w); });
afterEach(() => collect([]));
const base = Object.fromEntries(gen.params.filter(p => p.key).map(p => [p.key, p.default]));
function ok(name, parts) {
  assert.ok(parts.length >= 1, name);
  for (const p of parts) { assert.equal(p.solid.status(), 'NoError', name); assert.ok(p.solid.volume() > 0.5, `${name}/${p.name}`); }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(parts[i].solid.intersect(parts[j].solid).volume() < 0.05, `${name}: se pisan`);
  collect([]);
}
const styles = gen.params.find(p => p.key === 'style').options.map(o => o.value);
test('todos los estilos con sus valores', async () => {
  for (const style of styles) for (const accent of ['none', 'edge', 'line']) ok(`${style}/${accent}`, await gen.build({ ...base, style, accent }, ctx));
});
test('tramas y dibujos calados o de color, celular y tablet', async () => {
  for (const style of ['triangle', 'zen', 'desk']) for (const pattern of gen.params.find(p => p.key === 'pattern').options.map(o => o.value)) {
    for (const pMode of ['cut', 'inlay']) ok(`${style}/${pattern}/${pMode}`, await gen.build({ ...base, style, pattern, pMode }, ctx));
  }
  for (const style of styles) ok(`${style}/tablet`, await gen.build({ ...base, style, device: 'tablet', angle: 75, phoneT: 18, cable: false, ribs: false }, ctx));
});
