/**
 * Topper de torta: texto con contorno y púas para clavar.
 */
import { roundedRect, outline, fillHoles, polygonShape } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { smooth } from '../engine/shapes.js';
import { colorsParams, firstLine } from './_common.js';

export default {
  id: 'topper-torta',
  title: 'Topper de torta',
  description: 'Nombre, edad o frase con contorno y púas para clavar en la torta.',
  fileName: v => `topper_${firstLine(v.text1, v.text2)}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text1', type: 'text', label: 'Línea principal', default: 'Feliz cumple' },
    { key: 'font1', type: 'font', label: 'Tipografía principal', default: 'pacifico' },
    { key: 'text2', type: 'text', label: 'Segunda línea (opcional)', default: 'Gabriel' },
    { key: 'font2', type: 'font', label: 'Tipografía de la segunda línea', default: 'baloo', show: v => !!(v.text2 || '').trim() },
    { key: 'ratio', type: 'number', label: 'Tamaño de la segunda línea', default: 1.1, min: 0.4, max: 2, step: 0.05, unit: '×', show: v => !!(v.text2 || '').trim() },
    { key: 'gap', type: 'number', label: 'Separación entre líneas', default: -3, min: -15, max: 10, step: 0.5, unit: 'mm', show: v => !!(v.text2 || '').trim() },
    { key: 'width', type: 'number', label: 'Ancho total', default: 140, min: 60, max: 260, step: 1, unit: 'mm' },

    { type: 'group', label: 'Contorno y púas' },
    { key: 'border', type: 'number', label: 'Ancho del contorno', default: 3.5, min: 1.5, max: 10, step: 0.1, unit: 'mm' },
    { key: 'spikes', type: 'segment', label: 'Púas', default: 2, options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }] },
    { key: 'spikeL', type: 'number', label: 'Largo de las púas', default: 60, min: 25, max: 120, step: 1, unit: 'mm' },
    { key: 'spikeW', type: 'number', label: 'Ancho de las púas', default: 6, min: 3, max: 12, step: 0.5, unit: 'mm' },

    ...colorsParams({ max: 2, base: '#F72585', text: '#F5F5F5', baseLabel: 'Contorno y púas' }),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Base', default: 2.4, min: 1.2, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve del texto', default: 1, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const [f1, f2] = await Promise.all([ctx.font(v.font1), ctx.font(v.font2)]);
    let text = stackLines([{ font: f1, text: v.text1 || ' ', height: 20 }, { font: f2, text: v.text2, height: 20 * v.ratio }], v.gap);
    const b0 = text.bounds();
    text = text.scale((v.width - 2 * v.border) / (b0.max[0] - b0.min[0]));
    let base = fillHoles(outline(text, v.border));
    const b = base.bounds();
    const w = b.max[0] - b.min[0];
    // Barra inferior: une todo y sostiene las púas
    const barH = Math.max(4, v.spikeW);
    base = base.add(roundedRect(w * 0.7, barH, barH / 2).translate([(b.min[0] + b.max[0]) / 2, b.min[1] + barH / 2]));
    const n = Number(v.spikes);
    for (let i = 0; i < n; i++) {
      const x = (b.min[0] + b.max[0]) / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * w * 0.5);
      const top = b.min[1] + barH * 0.5, sw = v.spikeW;
      base = base.add(polygonShape([[x - sw / 2, top], [x + sw / 2, top], [x + sw * 0.15, top - v.spikeL], [x - sw * 0.15, top - v.spikeL]]));
    }
    base = smooth(base, 0.8);
    return layered({ base2d: base, text2d: text, colors: v.colors, mode: 'raised', cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
