/**
 * Colgante de nombres familiares: un medallón por nombre, con agujeros
 * arriba y abajo para unirlos con argollas en cadena.
 */
import { circle } from '../engine/geom.js';
import { layered, mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, thicknessParams, firstLine } from './_common.js';

const AREA = { heart: [0.62, 0.34, 0.06], circle: [0.7, 0.36, 0], star: [0.5, 0.22, -0.02], paw: [0.5, 0.26, -0.18], wavy: [0.68, 0.36, 0], rect: [0.78, 0.4, 0] };

export default {
  id: 'colgante-familia',
  title: 'Colgante de nombres familiares',
  description: 'Un medallón por nombre (corazón, círculo, estrella, huella…) para colgar en cadena.',
  fileName: v => `familia_${firstLine(v.names)}`,
  params: [
    { type: 'group', label: 'Nombres' },
    { key: 'names', type: 'text', label: 'Un nombre por línea', default: 'Familia\nAline\nAlex\nElisa', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'dancing' },

    { type: 'group', label: 'Medallones' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: Object.keys(AREA).map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'last', type: 'select', label: 'Forma del último', default: 'paw', options: [{ value: 'same', label: 'Igual a los demás' }, ...Object.keys(AREA).map(k => ({ value: k, label: SHAPES[k].label }))] },
    { key: 'size', type: 'number', label: 'Ancho de cada medallón', default: 38, min: 20, max: 80, step: 1, unit: 'mm' },
    { key: 'holeD', type: 'number', label: 'Diámetro de los agujeros', default: 3, min: 1.5, max: 6, step: 0.5, unit: 'mm' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },

    ...colorsParams({ max: 2, base: '#B08968', text: '#F5F5F5', baseLabel: 'Medallón' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 0.8 }),
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const names = String(v.names || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) names.push(' ');
    const parts = [];
    const cols = Math.min(4, names.length);
    names.forEach((name, i) => {
      const kind = i === names.length - 1 && v.last !== 'same' && names.length > 1 ? v.last : v.shape;
      const w = v.size, h = kind === 'rect' ? v.size * 0.6 : v.size * (kind === 'heart' ? 0.9 : 1);
      let shape = SHAPES[kind].make(w, h, 4);
      const b = shape.bounds();
      const r = v.holeD / 2, edge = r + 2;
      const holes = [];
      // Agujero de arriba (en el corazón, en el lóbulo izquierdo para no caer en la muesca)
      const topY = kind === 'heart' ? b.max[1] - edge - h * 0.08 : b.max[1] - edge - (kind === 'star' ? w * 0.05 : 0);
      const topX = kind === 'heart' ? 0 : 0;
      if (i > 0) holes.push(circle(r).translate([topX, kind === 'heart' ? b.max[1] - h * 0.24 : topY]));
      if (i < names.length - 1) holes.push(circle(r).translate([0, b.min[1] + edge + (kind === 'heart' ? h * 0.06 : kind === 'star' ? w * 0.08 : 0)]));
      let base = shape;
      for (const hole of holes) base = base.subtract(hole);
      const [aw, ah, ay] = AREA[kind];
      let top = fitInto(stackLines([{ font, text: name, height: 10 }]), w * aw, h * ah).translate([0, h * ay]);
      if (v.frame) top = top.add(shape.subtract(shape.offset(-1.2, 'Round', 2, 32)));
      for (const hole of holes) top = top.subtract(hole.offset(1, 'Round', 2, 24));
      const dx = (i % cols) * (v.size + 6), dy = -Math.floor(i / cols) * (v.size + 6);
      for (const p of layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText })) {
        parts.push({ ...p, solid: p.solid.translate([dx, dy, 0]) });
      }
    });
    return mergeByColor(parts);
  },
};
