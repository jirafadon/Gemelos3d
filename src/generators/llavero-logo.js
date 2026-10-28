/**
 * Llavero con nombre y logo: el dibujo a la izquierda del texto,
 * todo unido por el mismo contorno.
 */
import { textShape, outline, fillHoles, addRing } from '../engine/geom.js';
import { layered } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, colorsParams, modeParam, thicknessParams, ringParams, firstLine } from './_common.js';

export default {
  id: 'llavero-logo',
  title: 'Llavero con nombre y logo',
  description: 'Texto más un ícono o logo desde imagen, con contorno y argolla.',
  fileName: v => firstLine(v.text),
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Aline' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },
    { key: 'height', type: 'number', label: 'Alto del texto', default: 14, min: 6, max: 50, step: 0.5, unit: 'mm' },
    { type: 'group', label: 'Logo' },
    ...imageParams({ label: 'Logo o dibujo' }),
    { key: 'logoScale', type: 'number', label: 'Tamaño del logo', default: 1.4, min: 0.6, max: 3, step: 0.05, unit: '×', hint: 'Respecto del alto del texto.' },
    { key: 'logoSide', type: 'segment', label: 'Lado', default: 'right', options: [{ value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }] },
    { key: 'gap', type: 'number', label: 'Separación', default: 1.5, min: -6, max: 10, step: 0.5, unit: 'mm' },
    { type: 'group', label: 'Contorno' },
    { key: 'border', type: 'number', label: 'Ancho del contorno', default: 2.5, min: 0.8, max: 8, step: 0.1, unit: 'mm' },
    { key: 'border2', type: 'number', label: 'Ancho del contorno medio', default: 1.4, min: 0.6, max: 5, step: 0.1, unit: 'mm', show: v => v.colors === 3 },
    ...colorsParams({ max: 3, base: '#4A2C1A', mid: '#FCBF49', text: '#F5F5F5' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 1 }),
    ...ringParams({ def: 'left' }),
  ],
  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const text = textShape(font, v.text || ' ', { height: v.height });
    const lh = v.height * v.logoScale;
    const logo = fitInto(await silhouette(v, ctx, 100), lh * 1.6, lh);
    const tb = text.bounds(), lb = logo.bounds();
    const dx = v.logoSide === 'left' ? tb.min[0] - v.gap - lb.max[0] : tb.max[0] + v.gap - lb.min[0];
    const top = text.add(logo.translate([dx, 0]));
    const colors = Number(v.colors);
    let base = fillHoles(outline(top, v.border + (colors === 3 ? v.border2 : 0)));
    const mid = colors === 3 ? fillHoles(outline(top, v.border)) : null;
    base = addRing(base, { side: v.ring, holeD: v.holeD, wall: v.ringWall }).shape;
    return layered({ base2d: base, mid2d: mid, text2d: top, colors, mode: v.mode, cBase: v.cBase, cMid: v.cMid, cText: v.cText, hBase: v.hBase, hMid: v.hMid, hText: v.hText });
  },
};
