/**
 * String art: placa con postes repartidos por el contorno de una forma (corazón,
 * estrella, círculo o una letra) para tensar hilo, con el nombre abajo.
 * Los postes tienen cabeza para que el hilo no se salga.
 */
import { wasm, roundedRect, circle, slab, part, textShape } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

/** Puntos repartidos parejo sobre el contorno exterior de una forma. */
function pointsAlong(cs, n) {
  const polys = cs.toPolygons();
  const ring = polys.reduce((a, p) => (Math.abs(area(p)) > Math.abs(area(a)) ? p : a), polys[0]);
  const seg = [];
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    seg.push([a, b, l]); total += l;
  }
  const out = [];
  let k = 0, acc = 0;
  for (let j = 0; j < n; j++) {
    const target = j * total / n;
    while (acc + seg[k][2] < target && k < seg.length - 1) { acc += seg[k][2]; k++; }
    const [a, b, l] = seg[k], t = l ? (target - acc) / l : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; }

export default {
  id: 'string-art',
  title: 'String art',
  description: 'Placa con postes por el contorno de una forma o letra para tensar hilo, con nombre.',
  fileName: v => `string_art_${v.figure === 'letter' ? v.letter : v.figure}`,
  params: [
    { type: 'group', label: 'Figura' },
    { key: 'figure', type: 'segment', label: 'Figura', default: 'heart', options: [{ value: 'heart', label: 'Corazón' }, { value: 'star', label: 'Estrella' }, { value: 'circle', label: 'Círculo' }, { value: 'letter', label: 'Letra' }] },
    { key: 'letter', type: 'text', label: 'Letra', default: 'J', show: v => v.figure === 'letter' },
    { key: 'font', type: 'font', label: 'Tipografía de la letra', default: 'anton', show: v => v.figure === 'letter' },
    { key: 'size', type: 'number', label: 'Tamaño de la figura', default: 120, min: 50, max: 230, step: 1, unit: 'mm' },
    { key: 'pins', type: 'number', label: 'Cantidad de postes', default: 36, min: 8, max: 120, step: 1, unit: '' },
    { key: 'pinH', type: 'number', label: 'Alto de los postes', default: 10, min: 5, max: 25, step: 0.5, unit: 'mm' },
    { key: 'pinD', type: 'number', label: 'Grosor de los postes', default: 3, min: 2, max: 6, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Placa' },
    { key: 'name', type: 'text', label: 'Nombre abajo (opcional)', default: 'Mi hogar' },
    { key: 'nameFont', type: 'font', label: 'Tipografía', default: 'dancing', show: v => !!(v.name || '').trim() },
    { key: 'margin', type: 'number', label: 'Margen', default: 12, min: 5, max: 40, step: 1, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor de la placa', default: 3, min: 2, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hang', type: 'toggle', label: 'Agujero para colgar', default: true },
    { key: 'cPlate', type: 'color', label: 'Placa', default: '#F5F5F5' },
    { key: 'cPins', type: 'color', label: 'Postes y nombre', default: '#1E1E1E' },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const S = v.size;
    let fig;
    if (v.figure === 'letter') {
      const font = await ctx.font(v.font);
      fig = textShape(font, Array.from(String(v.letter || 'A').trim() || 'A')[0], { height: S });
    } else fig = SHAPES[v.figure].make(S, S * 0.9);
    const fb = fig.bounds();
    fig = fig.translate([-(fb.min[0] + fb.max[0]) / 2, -(fb.min[1] + fb.max[1]) / 2]);
    const pts = pointsAlong(fig, v.pins);
    const nameH = (v.name || '').trim() ? 16 : 0;
    const w = fb.max[0] - fb.min[0] + 2 * v.margin, h = fb.max[1] - fb.min[1] + 2 * v.margin + nameH;
    let plate = roundedRect(w, h, 6).translate([0, -nameH / 2]);
    if (v.hang) plate = plate.subtract(circle(2.5, 32).translate([0, (fb.max[1] - fb.min[1]) / 2 + v.margin / 2]));
    const parts = [part('Placa', v.cPlate, slab(plate, v.thick))];
    const r = v.pinD / 2;
    const pin = Manifold.cylinder(v.pinH, r, r, 24).add(Manifold.cylinder(1.2, r + 0.8, r + 0.8, 24).translate([0, 0, v.pinH - 0.01])).translate([0, 0, v.thick]);
    parts.push(part('Postes', v.cPins, Manifold.union(pts.map(([x, y]) => pin.translate([x, y, 0])))));
    if (nameH) {
      const font = await ctx.font(v.nameFont);
      const txt = fitInto(stackLines([{ font, text: v.name, height: 10 }], 0), w - 2 * v.margin, nameH * 0.7).translate([0, -(fb.max[1] - fb.min[1]) / 2 - v.margin / 2 - nameH / 2]);
      parts.push(part('Nombre', v.cPins, slab(txt, 1, v.thick)));
    }
    return mergeByColor(parts);
  },
};
