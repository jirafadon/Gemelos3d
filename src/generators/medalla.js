/**
 * Diseñá tu medalla: medalla redonda (u otras formas) con borde, laurel, un ícono,
 * texto principal (puesto, número o nombre) y texto chico abajo, con pasacinta o argolla.
 * En 2 o 3 colores; se imprime plana.
 */
import { wasm, circle, roundedRect, polygonShape, addRing } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { fitInto, star, heart } from '../engine/shapes.js';
import { birrete, ball, diploma, laurel } from '../engine/icons2d.js';
import { colorsParams, modeParam, firstLine } from './_common.js';

const ICON = (k, w) => k === 'star' ? star(w) : k === 'heart' ? heart(w, w * 0.9) : k === 'birrete' ? birrete(w) : k === 'ball' ? ball(w) : k === 'diploma' ? diploma(w) : null;

export default {
  id: 'medalla',
  title: 'Diseñá tu medalla',
  description: 'Medalla con borde, laurel, ícono y textos, con pasacinta o argolla.',
  fileName: v => `medalla_${firstLine(v.main, v.top, 'premio')}`,
  params: [
    { type: 'group', label: 'Textos' },
    { key: 'top', type: 'text', label: 'Texto de arriba', default: 'Torneo 2026' },
    { key: 'main', type: 'text', label: 'Texto principal', default: '1°', hint: 'Puesto, número, año o nombre.' },
    { key: 'bottom', type: 'text', label: 'Texto de abajo', default: 'Campeón' },
    { key: 'mainFont', type: 'font', label: 'Tipografía principal', default: 'bangers' },
    { key: 'font', type: 'font', label: 'Tipografía de los textos chicos', default: 'poppins' },

    { type: 'group', label: 'Diseño' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'circle', options: [{ value: 'circle', label: 'Redonda' }, { value: 'star', label: 'Estrella' }, { value: 'shield', label: 'Escudo' }] },
    { key: 'size', type: 'number', label: 'Diámetro', default: 60, min: 30, max: 120, step: 1, unit: 'mm' },
    { key: 'icon', type: 'select', label: 'Ícono', default: 'star', options: [{ value: 'none', label: 'Ninguno' }, { value: 'star', label: 'Estrella' }, { value: 'heart', label: 'Corazón' }, { value: 'ball', label: 'Pelota' }, { value: 'birrete', label: 'Birrete' }, { value: 'diploma', label: 'Diploma' }] },
    { key: 'laurel', type: 'toggle', label: 'Corona de laurel', default: true, show: v => v.shape === 'circle' },
    { key: 'rim', type: 'number', label: 'Borde', default: 2, min: 0, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hang', type: 'segment', label: 'Para colgar', default: 'ribbon', options: [{ value: 'ribbon', label: 'Pasacinta' }, { value: 'ring', label: 'Argolla' }, { value: 'none', label: 'Nada' }] },
    { key: 'ribbonW', type: 'number', label: 'Ancho de la cinta', default: 22, min: 10, max: 40, step: 1, unit: 'mm', show: v => v.hang === 'ribbon' },

    ...colorsParams({ max: 3, def: 3, base: '#FCBF49', mid: '#B8860B', text: '#1E1E1E', baseLabel: 'Medalla' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Medalla', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hMid', type: 'number', label: 'Borde y laurel', default: 0.8, min: 0.4, max: 3, step: 0.2, unit: 'mm', show: v => v.colors === 3 },
    { key: 'hText', type: 'number', label: 'Relieve', default: 0.8, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],
  async build(v, ctx) {
    const D = v.size, R = D / 2;
    const face = v.shape === 'star' ? star(D * 1.15, 8, 0.82, D * 0.02) : v.shape === 'shield' ? shieldShape(D) : circle(R, 128);
    const fb = face.bounds(), fr = Math.min(fb.max[0] - fb.min[0], fb.max[1] - fb.min[1]) / 2;
    // Borde y laurel (capa media)
    let deco = v.rim > 0 ? face.subtract(face.offset(-v.rim, 'Round', 2, 32)) : null;
    const useLaurel = v.laurel && v.shape === 'circle';
    if (useLaurel) { const l = laurel(R * 0.8).intersect(face.offset(-v.rim - 0.6, 'Round', 2, 32)); deco = deco ? deco.add(l) : l; }
    // Zona interior para textos e ícono
    const inner = useLaurel ? R * 0.62 : fr - v.rim - 3;
    const [mf, sf] = await Promise.all([ctx.font(v.mainFont), ctx.font(v.font)]);
    const items = [];
    const ic = v.icon !== 'none' ? ICON(v.icon, inner * 0.7) : null;
    if ((v.top || '').trim()) items.push(fitInto(stackLines([{ font: sf, text: v.top, height: 10 }], 0), inner * 1.5, inner * 0.24));
    if (ic) items.push(fitInto(ic, inner * 0.8, inner * 0.42));
    if ((v.main || '').trim()) items.push(fitInto(stackLines([{ font: mf, text: v.main, height: 10 }], 0), inner * 1.4, inner * (ic ? 0.6 : 0.85)));
    if ((v.bottom || '').trim()) items.push(fitInto(stackLines([{ font: sf, text: v.bottom, height: 10 }], 0), inner * 1.5, inner * 0.26));
    let text = stack(items, inner * 0.1);
    if (text) text = fitInto(text, inner * 1.6, inner * 1.75).intersect(face.offset(-v.rim - 1.2, 'Round', 2, 32));
    else text = circle(0.5, 12);
    // Pasacinta / argolla arriba
    let base = face;
    if (v.hang === 'ribbon') {
      const top = fb.max[1];
      const tab = roundedRect(v.ribbonW + 8, 11, 4).translate([0, top + 3.5]);
      base = base.add(tab).subtract(roundedRect(v.ribbonW + 1, 3.2, 1.2).translate([0, top + 4.2]));
    } else if (v.hang === 'ring') base = addRing(face, { side: 'top', holeD: 4, wall: 2.4 }).shape;
    const mid = v.colors === 3 && deco ? deco : null;
    let textLayer = text;
    if (v.colors < 3 && deco) textLayer = textLayer.add(deco);
    return layered({ base2d: base, mid2d: mid, text2d: textLayer, colors: mid ? 3 : Math.min(2, v.colors), mode: v.mode, cBase: v.cBase, cMid: v.cMid, cText: v.cText, hBase: v.hBase, hMid: v.hMid, hText: v.hText });
  },
};

/** Apila formas de arriba hacia abajo, centradas. */
export function stack(shapes, gap) {
  const { CrossSection } = wasm();
  if (!shapes.length) return null;
  let y = 0;
  const placed = shapes.map(s => {
    const b = s.bounds(), h = b.max[1] - b.min[1];
    const p = s.translate([-(b.min[0] + b.max[0]) / 2, y - b.max[1]]);
    y -= h + gap;
    return p;
  });
  const all = CrossSection.union(placed);
  const b = all.bounds();
  return all.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
}

function shieldShape(D) {
  const right = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; right.push([D * 0.45 * Math.cos(t * Math.PI / 2) ** 0.7, D * 0.55 * (1 - t) - D * 0.5]); }
  const pts = [[-D * 0.45, D * 0.5], [D * 0.45, D * 0.5], ...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  return polygonShape(pts);
}
