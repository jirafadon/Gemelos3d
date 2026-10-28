import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
const parseFont = b => opentype.parse(b);
import Module from 'manifold-3d';
import { setWasm, textShape, modelStats } from '../src/engine/geom.js';
import { to3MF, mergedSTL } from '../src/engine/export.js';
import { enableGC, collect } from '../src/engine/gc.js';
import llavero from '../src/generators/llavero-nombre.js';

const fontFile = (pkg, file) => { const b = fs.readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`); return parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
let ctx;
before(async () => {
  const w = await Module(); w.setup(); enableGC(w); setWasm(w);
  const fonts = { pacifico: fontFile('pacifico', 'pacifico-latin-400-normal.woff'), anton: fontFile('anton', 'anton-latin-400-normal.woff') };
  ctx = { font: async id => fonts[id] || fonts.pacifico };
});

const defaults = g => Object.fromEntries(g.params.filter(p => p.key).map(p => [p.key, p.default]));

test('el texto respeta el alto pedido', async () => {
  const cs = textShape(await ctx.font('anton'), 'HOLA', { height: 20 });
  const b = cs.bounds();
  assert.ok(Math.abs((b.max[1] - b.min[1]) - 20) < 0.01);
  assert.ok(cs.area() > 50);
});

for (const colors of [1, 2, 3]) for (const mode of ['raised', 'flush']) {
  test(`llavero ${colors} color(es), texto ${mode}`, async () => {
    const parts = await llavero.build({ ...defaults(llavero), colors, mode, cText: '#FFFFFF', cMid: '#FF0000' }, ctx);
    assert.equal(parts.length, colors);
    for (const p of parts) { assert.equal(p.solid.status(), 'NoError'); assert.ok(p.solid.volume() > 1, p.name); }
    const s = modelStats(parts);
    assert.ok(s.size[0] > 30 && s.size[0] < 120, `ancho ${s.size[0]}`);
    const zip = to3MF(parts); assert.ok(zip.length > 1000);
    const stl = mergedSTL(parts); assert.equal(stl.length, 84 + new DataView(stl.buffer).getUint32(80, true) * 50);
  });
}

test('las piezas de colores no se pisan', async () => {
  const parts = await llavero.build({ ...defaults(llavero), colors: 3, mode: 'raised' }, ctx);
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++)
    assert.ok(parts[i].solid.intersect(parts[j].solid).volume() < 0.01, `${parts[i].name} vs ${parts[j].name}`);
});

test('la limpieza de memoria no rompe el modelo que se muestra', async () => {
  const a = await llavero.build({ ...defaults(llavero), colors: 3 }, ctx);
  collect(a.map(p => p.solid));
  const b = await llavero.build({ ...defaults(llavero), colors: 2, text: 'Otro' }, ctx);
  collect(b.map(p => p.solid));
  assert.ok(to3MF(b).length > 1000);
  assert.ok(b[0].solid.volume() > 1);
});
