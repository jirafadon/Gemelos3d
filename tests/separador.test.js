/** Separador por colores: elegir, cortar plano o curvo y encastrar deja piezas cerradas que no se pisan. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { setWasm } from '../src/engine/geom.js';
import * as S from '../src/tools/split-core.js';

before(async () => { const w = await Module(); w.setup(); setWasm(w); });
const nearest = (info, q) => { let best = 0, bd = Infinity; for (let t = 0; t < info.nt; t++) { const d = (info.centers[t * 3] - q[0]) ** 2 + (info.centers[t * 3 + 1] - q[1]) ** 2 + (info.centers[t * 3 + 2] - q[2]) ** 2; if (d < bd) { bd = d; best = t; } } return best; };

test('la varita toma la nariz y el corte plano la separa sin perder volumen', () => {
  const m = S.sampleModel(), info = S.meshInfo(m);
  const sel = S.wandSelect(info, nearest(info, [0, -19, 55]), 28);
  assert.ok(sel.size > 20 && sel.size < info.nt / 10, `selección ${sel.size}`);
  const plane = S.fitPlane(info, sel);
  assert.ok(plane.normal[1] < -0.9, 'la normal mira hacia la punta de la nariz');
  const cut = S.planeCutter(info, sel, plane, { depth: 0.5 });
  const { inside, rest } = S.applyCut(m, cut.tool);
  assert.ok(Math.abs(inside.volume() + rest.volume() - m.volume()) < 0.5);
  assert.ok(inside.intersect(rest).volume() < 0.01);
  for (const kind of ['peg', 'double', 'key']) {
    const j = S.addJoint(inside, rest, cut, { kind, gap: 0.15 });
    assert.equal(j.note, '', kind);
    assert.ok(j.inside.intersect(j.rest).volume() < 0.01, `${kind}: se pisan`);
    assert.equal(S.checkPart(j.inside).bodies, 1, `${kind}: pieza suelta`);
    assert.equal(S.checkPart(j.rest).bodies, 1, `${kind}: resto en pedazos`);
    // El agujero es más grande que el tetón: la pieza entra con holgura
    assert.ok(j.rest.volume() < rest.volume() - j.info.count * Math.PI * j.info.r ** 2 * j.info.L * 0.9);
  }
});

test('cierre curvo: una cáscara del botón, cerrada y sin pisar el resto', () => {
  const m = S.sampleModel(), info = S.meshInfo(m);
  const sel = S.wandSelect(info, nearest(info, [0, -22, 24]), 28);
  const sk = S.skinCutter(info, sel, 1.2);
  assert.ok(sk);
  const { inside, rest } = S.applyCut(m, sk.tool);
  assert.ok(inside.volume() > 1 && inside.status() === 'NoError');
  assert.ok(Math.abs(inside.intersect(rest).volume()) < 0.1);
});

test('el pincel y el tubo (gorro sin tapa) se cortan del lado correcto', () => {
  const m = S.sampleModel(), info = S.meshInfo(m);
  const seed = nearest(info, [0, -11, 70]);
  const sel = S.wandSelect(info, seed, 28);
  const plane = S.fitPlane(info, sel);
  // El plano del gorro va en la base (el lazo de abajo), mirando hacia arriba
  assert.ok(plane.normal[2] > 0.9 && plane.origin[2] < 66, JSON.stringify(plane.origin));
  const br = S.brushSelect(info, seed, [0, -11, 70], 4);
  assert.ok(br.size > 0 && br.size < sel.size);
});

test('corte recto en Z con tetón y con llave: dos piezas cerradas que no se pisan', () => {
  const m = S.sampleModel();
  for (const kind of ['peg', 'key', 'double']) {
    const cut = S.axisCutter(m, 2, kind === 'double' ? 0.28 : 0.5);
    const { inside, rest } = S.applyCut(m, cut.tool);
    assert.ok(Math.abs(inside.volume() + rest.volume() - m.volume()) < 0.5);
    const j = S.addJoint(inside, rest, cut, { kind, gap: 0.2 });
    assert.equal(j.note, '', kind);
    assert.ok(j.inside.intersect(j.rest).volume() < 0.01);
    assert.equal(S.checkPart(j.inside).bodies, 1);
  }
  for (const axis of [0, 1]) { const c = S.axisCutter(m, axis, 0.3); const r = S.applyCut(m, c.tool); assert.ok(r.inside.volume() > 1 && r.rest.volume() > 1); }
});
