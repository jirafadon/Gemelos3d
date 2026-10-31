/**
 * Llavero con forma: corazón, estrella, círculo, óvalo ondulado, huella o hueso,
 * con el nombre ajustado adentro y argolla.
 */
import { addRing } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { SHAPES, SHAPE_OPTIONS, fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, thicknessParams, ringParams, firstLine, textPlaceParams, placeText } from './_common.js';

export default {
  id: 'llavero-forma',
  title: 'Llavero con forma',
  description: 'Más de 20 formas (corazón, estrella, nube, corona, camiseta…) con el nombre adentro.',
  fileName: v => firstLine(v.text),
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Lola', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },

    ...textPlaceParams(),
    { type: 'group', label: 'Forma' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: SHAPE_OPTIONS.filter(o => o.value !== 'rect') },
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
    const S = SHAPES[v.shape] || SHAPES.heart, w = v.size, h = w * S.aspect;
    const shape = S.make(w, h, Math.min(8, h * 0.25));
    const [aw, ah, ay] = S.area;
    const lines = String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 }));
    const text = placeText(fitInto(stackLines(lines, 1.5), w * aw, h * ah * (lines.length > 1 ? 1.5 : 1)).translate([0, w * ay]), v, shape);
    let top = text;
    if (v.frame) top = top.add(shape.subtract(shape.offset(-v.frameW, 'Round', 2, 32)));
    const { shape: base } = addRing(shape, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    return layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
