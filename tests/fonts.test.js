/** Todas las tipografías se leen y dan un contorno 3D válido (con tildes, ñ y números). */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import opentype from 'opentype.js';
import Module from 'manifold-3d';
import { setWasm, textShape } from '../src/engine/geom.js';

const src = fs.readFileSync('src/engine/fonts.js', 'utf8');
const files = [...src.matchAll(/@fontsource\/([^']+?)\?url/g)].map(m => m[1]);
before(async () => { const w = await Module(); w.setup(); setWasm(w); });

test(`las ${files.length} tipografías generan texto`, () => {
  assert.ok(files.length >= 60);
  for (const f of files) {
    const b = fs.readFileSync(`node_modules/@fontsource/${f}`);
    const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const cs = textShape(font, 'Joni Ñandú 2026', { height: 10 });
    assert.ok(!cs.isEmpty() && cs.area() > 20, `${f}: vacío`);
    const solid = cs.extrude(2);
    assert.equal(solid.status(), 'NoError', f);
  }
});
