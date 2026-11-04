/**
 * Estudio de dados: D4, D6, D8, D10, D12 y D20 con números (o puntos en el D6) grabados
 * o embutidos en otro color. Caras opuestas que suman lo justo, 6 y 9 con rayita,
 * bordes redondeados y caras personalizadas (texto o emoji por cara).
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, star, heart } from '../engine/shapes.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function d10Points() {
  // Trapezoedro pentagonal: anillo de 10 vértices alternando arriba/abajo y dos puntas
  const z0 = 0.105, ring = k => [Math.cos(k * Math.PI / 5), Math.sin(k * Math.PI / 5), k % 2 ? -z0 : z0];
  const planar = h => { const A = [0, 0, h], a = sub(ring(0), A), b = sub(ring(1), A), c = sub(ring(2), A); return dot(a, cross(b, c)); };
  let lo = 0.2, hi = 3;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Math.sign(planar(m)) === Math.sign(planar(lo))) lo = m; else hi = m; }
  const h = (lo + hi) / 2;
  return [[0, 0, h], [0, 0, -h], ...Array.from({ length: 10 }, (_, k) => ring(k))];
}

const SOLIDS = {
  d4: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  d6: () => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z]))),
  d8: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  d10: d10Points,
  d12: () => [...[-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z]))),
    ...[-1, 1].flatMap(a => [-1, 1].flatMap(b => [[0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]]))],
  d20: () => [-1, 1].flatMap(a => [-1, 1].flatMap(b => [[0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]])),
};
const COUNT = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

/** Caras del sólido: normal, centro y vértices, agrupando triángulos coplanares. */
function faces(solid) {
  const m = solid.getMesh(), n = m.numProp, P = m.vertProperties, T = m.triVerts;
  const vp = i => [P[i * n], P[i * n + 1], P[i * n + 2]];
  const list = [];
  for (let t = 0; t < T.length; t += 3) {
    const a = vp(T[t]), b = vp(T[t + 1]), c = vp(T[t + 2]);
    const nr = norm(cross(sub(b, a), sub(c, a)));
    let f = list.find(x => dot(x.n, nr) > 0.999);
    if (!f) { f = { n: nr, pts: [] }; list.push(f); }
    f.pts.push(a, b, c);
  }
  for (const f of list) {
    const uniq = [];
    for (const p of f.pts) if (!uniq.some(q => Math.hypot(...sub(p, q)) < 1e-6)) uniq.push(p);
    f.pts = uniq;
    f.c = uniq.reduce((s, p) => [s[0] + p[0] / uniq.length, s[1] + p[1] / uniq.length, s[2] + p[2] / uniq.length], [0, 0, 0]);
    // Radio inscripto aproximado (polígono regular de k lados)
    f.r = Math.min(...uniq.map(p => Math.hypot(...sub(p, f.c)))) * Math.cos(Math.PI / Math.max(3, uniq.length));
  }
  return list;
}

/** Puntos del D6 (como los dados de siempre). */
function pips(k, s) {
  const o = s * 0.28, P = { 1: [[0, 0]], 2: [[-o, o], [o, -o]], 3: [[-o, o], [0, 0], [o, -o]], 4: [[-o, o], [o, o], [-o, -o], [o, -o]], 5: [[-o, o], [o, o], [0, 0], [-o, -o], [o, -o]], 6: [[-o, o], [o, o], [-o, 0], [o, 0], [-o, -o], [o, -o]] }[k] || [[0, 0]];
  return wasm().CrossSection.union(P.map(p => circle(s * 0.09, 32).translate(p)));
}

export default {
  id: 'dados',
  title: 'Estudio de dados',
  description: 'D4, D6, D8, D10, D12 y D20 con números o puntos grabados o en otro color, bordes redondeados y caras personalizadas.',
  fileName: v => `dado_${v.type}`,
  params: [
    { type: 'group', label: 'Dado' },
    { key: 'type', type: 'segment', label: 'Tipo', default: 'd6', options: Object.keys(COUNT).map(k => ({ value: k, label: k.toUpperCase() })) },
    { key: 'size', type: 'number', label: 'Tamaño (entre caras)', default: 20, min: 10, max: 60, step: 0.5, unit: 'mm' },
    { key: 'round', type: 'number', label: 'Bordes redondeados', default: 30, min: 0, max: 100, step: 1, unit: '%' },

    { type: 'group', label: 'Caras' },
    { key: 'marks', type: 'segment', label: 'Marcas', default: 'pips', options: [{ value: 'pips', label: 'Puntos (D6)' }, { value: 'numbers', label: 'Números' }, { value: 'custom', label: 'Personalizadas' }] },
    { key: 'custom', type: 'text', label: 'Una cara por renglón', default: 'SÍ\nNO\nTAL VEZ\nOTRA VEZ\n¡YA!\n★', multiline: true, show: v => v.marks === 'custom', hint: 'Si ponés menos renglones que caras, se repiten. ★ y ♥ salen dibujados.' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'russo', show: v => v.marks !== 'pips' || v.type !== 'd6' },
    { key: 'textSize', type: 'number', label: 'Tamaño de las marcas', default: 70, min: 30, max: 100, step: 1, unit: '%' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 0.8, min: 0.3, max: 2, step: 0.1, unit: 'mm' },
    { key: 'mode', type: 'segment', label: 'Cómo van', default: 'inlay', options: [{ value: 'inlay', label: 'En otro color' }, { value: 'engrave', label: 'Grabadas (para pintar)' }] },

    { type: 'group', label: 'Colores' },
    { key: 'cDie', type: 'color', label: 'Dado', default: '#F5F5F5' },
    { key: 'cMark', type: 'color', label: 'Marcas', default: '#1E1E1E', show: v => v.mode === 'inlay' },
  ],

  async build(v, ctx) {
    const { Manifold } = wasm();
    const t = v.type in SOLIDS ? v.type : 'd6';
    let die = Manifold.hull(SOLIDS[t]().map(p => p));
    // Escala: distancia entre caras = tamaño (en el D4, la altura)
    let F = faces(die);
    const inR = Math.min(...F.map(f => dot(f.c, f.n)));
    const k = t === 'd4' ? v.size / (inR * 4) : v.size / 2 / inR;
    die = die.scale([k, k, k]);
    F = faces(die);
    // Bordes redondeados: intersección con una esfera
    if (v.round > 0) {
      const circR = Math.max(...SOLIDS[t]().map(p => Math.hypot(...p))) * k;
      const inr = Math.min(...F.map(f => dot(f.c, f.n)));
      const R = circR - (circR - inr * 1.02) * (v.round / 100) * (t === 'd4' ? 0.55 : 0.85);
      die = die.intersect(Manifold.sphere(R, 96));
    }
    const n = COUNT[t];
    // Numeración: opuestas suman n+1
    const order = [];
    const used = new Set();
    F.sort((a, b) => b.n[2] - a.n[2] || b.n[1] - a.n[1] || b.n[0] - a.n[0]);
    let lo = 1, hi = n;
    for (let i = 0; i < F.length; i++) {
      if (used.has(i)) continue;
      used.add(i); F[i].num = lo++;
      const j = F.findIndex((f, jj) => !used.has(jj) && dot(f.n, F[i].n) < -0.999);
      if (j >= 0) { used.add(j); F[j].num = hi--; }
    }
    if (t === 'd4') F.forEach((f, i) => { f.num = i + 1; });
    const font = v.marks !== 'pips' || t !== 'd6' ? await ctx.font(v.font) : null;
    const customs = String(v.custom || '').split('\n').map(s => s.trim()).filter(Boolean);
    const cuts = [];
    for (const f of F) {
      const s = f.r * 2 * (v.textSize / 100) * (t === 'd4' ? 0.8 : 0.9);
      let mark;
      if (t === 'd6' && v.marks === 'pips') mark = pips(f.num, f.r * 2 * (v.textSize / 100) * 1.2);
      else {
        const label = v.marks === 'custom' && customs.length ? customs[(f.num - 1) % customs.length] : String(f.num);
        // Símbolos dibujados (la tipografía no siempre los tiene)
        let cs = label === '★' ? star(10, 5, 0.45, 0.3) : /^(♥|❤)/.test(label) ? heart(10) : stackLines([{ font, text: label, height: 10 }]);
        if (cs.isEmpty()) cs = stackLines([{ font, text: '?', height: 10 }]);
        cs = fitInto(cs, s, s * (label.length > 2 ? 0.55 : 0.75));
        // 6 y 9 con rayita abajo para no confundirlos
        if ((label === '6' || label === '9') && n > 6) { const b = cs.bounds(); cs = cs.add(roundedRect((b.max[0] - b.min[0]) * 0.8, s * 0.07, s * 0.03).translate([0, b.min[1] - s * 0.1])); }
        mark = cs;
      }
      // Marco de la cara: u y v en el plano, "arriba" hacia el primer vértice
      const nn = f.n, up0 = norm(sub(f.pts[0], f.c));
      const vv = norm(sub(up0, nn.map(x => x * dot(up0, nn)))), uu = cross(vv, nn);
      const M = [uu[0], uu[1], uu[2], 0, vv[0], vv[1], vv[2], 0, nn[0], nn[1], nn[2], 0, f.c[0], f.c[1], f.c[2], 1];
      cuts.push(mark.extrude(v.depth + 2).translate([0, 0, -v.depth]).transform(M));
    }
    const tool = Manifold.union(cuts);
    const body = die.subtract(tool);
    const parts = [part('Dado', v.cDie, body)];
    if (v.mode === 'inlay') parts.push(part('Marcas', v.cMark, die.intersect(tool)));
    // Apoyado sobre una cara (la de abajo) para imprimir
    const bottom = F.reduce((b, f) => (f.n[2] < b.n[2] ? f : b), F[0]);
    const q = rotTo(bottom.n, [0, 0, -1]);
    return mergeByColor(parts.map(p => {
      let s2 = p.solid.transform(q);
      return { ...p, solid: s2 };
    })).map((p, _, arr) => {
      const minZ = Math.min(...arr.map(x => x.solid.boundingBox().min[2]));
      return { ...p, solid: p.solid.translate([0, 0, -minZ]) };
    });
  },
};

/** Matriz que gira el vector a hasta b. */
function rotTo(a, b) {
  a = norm(a); b = norm(b);
  const c = dot(a, b);
  if (c > 0.99999) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  if (c < -0.99999) return [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];
  const ax = norm(cross(a, b)), s = Math.sqrt(1 - c * c), C = 1 - c, [x, y, z] = ax;
  // Rodrigues, en columnas
  return [c + x * x * C, y * x * C + z * s, z * x * C - y * s, 0,
    x * y * C - z * s, c + y * y * C, z * y * C + x * s, 0,
    x * z * C + y * s, y * z * C - x * s, c + z * z * C, 0, 0, 0, 0, 1];
}
