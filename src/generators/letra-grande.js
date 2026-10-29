/**
 * Letra grande con nombre: una inicial gruesa y el nombre en cursiva cruzándola,
 * unido a la letra por su contorno. En 2 o 3 colores, en relieve o al ras.
 */
import { textShape } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, firstLine } from './_common.js';

export default {
  id: 'letra-grande',
  title: 'Letra grande con nombre',
  description: 'Inicial grande con el nombre en cursiva cruzándola, para mesa o pared.',
  fileName: v => `letra_${(v.letter || 'A').slice(0, 1)}_${firstLine(v.name)}`,
  params: [
    { type: 'group', label: 'Letra' },
    { key: 'letter', type: 'text', label: 'Inicial', default: 'M' },
    { key: 'letterFont', type: 'font', label: 'Tipografía de la letra', default: 'anton' },
    { key: 'size', type: 'number', label: 'Alto de la letra', default: 110, min: 40, max: 250, step: 1, unit: 'mm' },

    { type: 'group', label: 'Nombre' },
    { key: 'name', type: 'text', label: 'Nombre', default: 'Martina' },
    { key: 'nameFont', type: 'font', label: 'Tipografía del nombre', default: 'pacifico' },
    { key: 'nameW', type: 'number', label: 'Ancho del nombre', default: 1.15, min: 0.6, max: 1.8, step: 0.05, unit: '× letra', hint: 'Más de 1 hace que el nombre sobresalga a los costados.' },
    { key: 'nameY', type: 'number', label: 'Altura del nombre', default: -0.1, min: -0.45, max: 0.45, step: 0.01, unit: '×' },
    { key: 'outline', type: 'number', label: 'Contorno del nombre', default: 2, min: 0.8, max: 6, step: 0.2, unit: 'mm' },

    ...colorsParams({ max: 3, def: 3, base: '#F5F5F5', mid: '#E76F51', text: '#264653', baseLabel: 'Letra' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Letra', default: 12, min: 3, max: 40, step: 0.5, unit: 'mm', hint: 'Desde 10 mm se para sola en un estante.' },
    { key: 'hMid', type: 'number', label: 'Contorno del nombre', default: 1, min: 0.4, max: 4, step: 0.2, unit: 'mm', show: v => v.colors === 3 },
    { key: 'hText', type: 'number', label: 'Relieve del nombre', default: 1.2, min: 0.4, max: 5, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const [lf, nf] = await Promise.all([ctx.font(v.letterFont), ctx.font(v.nameFont)]);
    const ch = Array.from(String(v.letter || 'A').trim() || 'A')[0];
    const letter = textShape(lf, ch, { height: v.size });
    const lb = letter.bounds();
    const lw = lb.max[0] - lb.min[0];
    let name = stackLines([{ font: nf, text: v.name || ' ', height: 10 }], 0);
    name = fitInto(name, lw * v.nameW, v.size * 0.4).translate([0, v.size * v.nameY]);
    const ring = name.offset(v.outline, 'Round', 2, 32);
    const base = letter.add(ring);
    return layered({ base2d: base, mid2d: ring, text2d: name, colors: v.colors, mode: v.mode, cBase: v.cBase, cMid: v.cMid, cText: v.cText, hBase: v.hBase, hMid: v.hMid, hText: v.hText });
  },
};
