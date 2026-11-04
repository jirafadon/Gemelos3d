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

test('soporte con logo + nombre: calado, en color, en cada estilo con respaldo', async () => {
  const logo = (await import('../src/generators/soporte-logo.js')).default;
  const b2 = Object.fromEntries(logo.params.filter(p => p.key).map(p => [p.key, p.default]));
  for (const style of ['triangle', 'desk', 'classic', 'zen']) for (const pMode of ['cut', 'inlay']) for (const text of ['Gemelos 3D', '']) {
    ok(`${style}/${pMode}/${text || 'solo logo'}`, await logo.build({ ...b2, style, pMode, text, mScale: 80 }, ctx));
  }
});

test('soporte de bolsillo: las hojas salen sueltas de la tarjeta y giran sin chocar hasta 60°', async () => {
  const fold = (await import('../src/generators/soporte-plegable.js')).default;
  const b2 = Object.fromEntries(fold.params.filter(p => p.key).map(p => [p.key, p.default]));
  const [card, leg, stop] = (await fold.build({ ...b2, text: '', _raw: true }, ctx)).map(p => p.solid);
  assert.equal(card.add(leg).add(stop).decompose().filter(x => x.volume() > 0.01).length, 3, 'las hojas quedaron pegadas');
  const ly = b2.h / 2 - 9 - b2.t / 2, sy = -b2.h / 2 + 5 + 14 - b2.t / 2, r = b2.t / 2;
  for (const th of [20, 45, 60]) {
    assert.ok(leg.translate([0, -ly, -r]).rotate([th, 0, 0]).translate([0, ly, r]).intersect(card).volume() < 0.01, `pata a ${th}°`);
    assert.ok(stop.translate([0, -sy, -r]).rotate([-th, 0, 0]).translate([0, sy, r]).intersect(card).volume() < 0.01, `tope a ${th}°`);
  }
  const multi = await fold.build({ ...b2, kind: 'multi' }, ctx);
  ok('multiángulo', multi);
});
