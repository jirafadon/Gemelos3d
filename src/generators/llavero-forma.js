/**
 * Llavero con forma: corazón, estrella, círculo, óvalo ondulado, huella o hueso,
 * con el nombre ajustado adentro y argolla.
 */
import { addRing } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, thicknessParams, ringParams, firstLine } from './_common.js';

// Zona útil para el texto: [ancho, alto, corrimiento y] en proporción del tamaño
const AREA = {
  heart: [0.62, 0.36, 0.06], star: [0.5, 0.24, -0.02], circle: [0.74, 0.42, 0], wavy: [0.72, 0.42, 0],
  oval: [0.74, 0.44, 0], paw: [0.5, 0.26, -0.18], bone: [0.56, 0.4, 0], rect: [0.84, 0.6, 0],
};
const ASPECT = { heart: 0.9, star: 1, circle: 1, wavy: 0.72, oval: 0.62, paw: 1, bone: 0.42, rect: 0.5 };

export default {
  id: 'llavero-forma',
  title: 'Llavero con forma',
  description: 'Corazón, estrella, huella, hueso u ondulado, con el nombre adentro.',
  fileName: v => firstLine(v.text),
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Lola', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },

    { type: 'group', label: 'Forma' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: Object.keys(AREA).map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'size', type: 'number', label: 'Ancho', default: 45, min: 25, max: 90, step: 1, unit: 'mm' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },
    { key: 'frameW', type: 'number', label: 'Ancho del borde', default: 1.4, min: 0.8, max: 4, step: 0.1, unit: 'mm', show: v => v.frame },

    ...colorsParams({ max: 2, base: '#E11D48', text: '#F5F5F5', baseLabel: 'Forma' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 1 }),
    ...ringParams({ def: 'top', options: ['top', 'left', 'right', 'none'] }),
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const w = v.size, h = w * ASPECT[v.shape];
    const shape = SHAPES[v.shape].make(w, h, Math.min(8, h * 0.25));
    const [aw, ah, ay] = AREA[v.shape];
    const lines = String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 }));
    const text = fitInto(stackLines(lines, 1.5), w * aw, w * ASPECT[v.shape] * ah * (lines.length > 1 ? 1.5 : 1)).translate([0, w * ay]);
    let top = text;
    if (v.frame) top = top.add(shape.subtract(shape.offset(-v.frameW, 'Round', 2, 32)));
    const { shape: base } = addRing(shape, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    return layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
