/** Adornos navideños: cada modelo arma sólidos válidos, de una pieza por color y sin pisarse. */
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import { enableGC, collect } from '../src/engine/gc.js';
import gen from '../src/generators/adorno-navidad.js';

let font;
const ctx = { font: async () => {
  if (!font) { const b = fs.readFileSync('node_modules/@fontsource/pacifico/files/pacifico-latin-400-normal.woff'); font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return font;
} };
before(async () => { const w = await Module(); w.setup(); enableGC(w); setWasm(w); });
afterEach(() => collect([]));
const base = Object.fromEntries(gen.params.filter(p => p.key).map(p => [p.key, p.default]));
const kinds = gen.params.find(p => p.key === 'kind').options.map(o => o.value);

function ok(name, parts) {
  assert.ok(parts.length >= 1, name);
  for (const p of parts) { assert.equal(p.solid.status(), 'NoError', name); assert.ok(p.solid.volume() > 0.5, `${name}/${p.name}`); }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(parts[i].solid.intersect(parts[j].solid).volume() < 0.05, `${name}: se pisan`);
  // El adorno tiene que salir de una sola pieza (nada suelto)
  const all = parts.slice(1).reduce((a, p) => a.add(p.solid), parts[0].solid);
  assert.equal(all.decompose().length, 1, `${name}: quedó algo suelto`);
  collect([]);
}

test('todos los modelos, con y sin segunda línea', async () => {
  for (const kind of kinds) for (const line2 of ['', '2026']) {
    const t0 = Date.now();
    ok(`${kind}/${line2 || '1 línea'}`, await gen.build({ ...base, kind, line2 }, ctx));
    assert.ok(Date.now() - t0 < 8000, `${kind}: tarda demasiado`);
  }
});
test('colores: clásicos, elegidos y uno solo; también los guardados viejos (1 y 2)', async () => {
  for (const colors of ['auto', 'custom', 'one', 1, 2]) {
    const parts = await gen.build({ ...base, kind: 'gnome', colors }, ctx);
    ok(`gnome/${colors}`, parts);
    if (colors === 'one' || colors === 1) assert.equal(parts.length, 1);
  }
});
test('tamaños chicos y grandes', async () => {
  for (const kind of kinds) for (const size of [45, 140]) ok(`${kind}/${size}`, await gen.build({ ...base, kind, size, name: 'Valentina' }, ctx));
});

test('árbol de nombres: de 1 a 7 pisos, para parar o colgar', async () => {
  const tree = (await import('../src/generators/arbol-nombres.js')).default;
  const b2 = Object.fromEntries(tree.params.filter(p => p.key).map(p => [p.key, p.default]));
  for (const n of [1, 3, 7]) for (const use of ['stand', 'hang']) for (const trunk of ['Pérez 2026', '']) {
    const names = ['Elisa', 'Alex', 'Aline', 'Mamá y Papá', 'Tito', 'Valentina', 'Nono'].slice(0, n).join('\n');
    const parts = await tree.build({ ...b2, names, use, trunk }, ctx);
    for (const p of parts) { assert.equal(p.solid.status(), 'NoError'); assert.ok(p.solid.volume() > 0.5, p.name); }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(parts[i].solid.intersect(parts[j].solid).volume() < 0.05, `${n}/${use}: se pisan ${parts[i].name}/${parts[j].name}`);
    // Todo el árbol de una pieza (la base va aparte)
    const noBase = parts.map(p => p.solid).reduce((a, s) => a.add(s));
    assert.equal(noBase.decompose().length, use === 'stand' ? 2 : 1, `${n}/${use}/${trunk}: piezas sueltas`);
    collect([]);
  }
});

test('adorno giratorio: el aro y la figura quedan separados por la holgura y la figura gira sin tocar', async () => {
  const spin = (await import('../src/generators/adorno-giratorio.js')).default;
  const b2 = Object.fromEntries(spin.params.filter(p => p.key).map(p => [p.key, p.default]));
  for (const inner of spin.params.find(p => p.key === 'inner').options.map(o => o.value)) for (const back of ['Navidad 2026', '']) {
    const parts = await spin.build({ ...b2, inner, back }, ctx);
    for (const p of parts) assert.equal(p.solid.status(), 'NoError', inner);
    const aro = parts.find(p => p.name === 'Aro').solid;
    const fig = parts.filter(p => p.name !== 'Aro').map(p => p.solid).reduce((a, s) => a.add(s));
    assert.equal(aro.decompose().length, 1, `${inner}: aro suelto`);
    assert.equal(fig.decompose().length, 1, `${inner}: figura suelta`);
    // Girada a 30, 60 y 90 grados sobre el eje, no choca con el aro
    for (const a of [0, 30, 60, 90, 150]) {
      const r = fig.translate([0, 0, -b2.thick / 2]).rotate([0, a, 0]).translate([0, 0, b2.thick / 2]);
      assert.ok(r.intersect(aro).volume() < 0.01, `${inner}: choca a ${a}°`);
    }
    collect([]);
  }
});
