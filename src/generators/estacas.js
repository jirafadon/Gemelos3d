/**
 * Señaladores y estacas: cartel con texto y una estaca en punta,
 * para macetas, huertas o tortas.
 */
import { polygonShape } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto, smooth } from '../engine/shapes.js';
import { colorsParams, modeParam, firstLine } from './_common.js';

const AREA = { rect: [0.84, 0.66], oval: [0.72, 0.56], wavy: [0.68, 0.52], heart: [0.6, 0.42], circle: [0.68, 0.5] };

export default {
  id: 'estacas',
  title: 'Señaladores y estacas',
  description: 'Carteles con estaca para macetas, huertas y tortas.',
  fileName: v => `estaca_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Cartel' },
    { key: 'text', type: 'text', label: 'Texto', default: 'Albahaca', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'fredoka' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'rect', options: Object.keys(AREA).map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'width', type: 'number', label: 'Ancho del cartel', default: 60, min: 25, max: 160, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto del cartel', default: 26, min: 14, max: 120, step: 1, unit: 'mm', show: v => v.shape !== 'circle' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },

    { type: 'group', label: 'Estaca' },
    { key: 'stakeL', type: 'number', label: 'Largo', default: 90, min: 20, max: 200, step: 1, unit: 'mm' },
    { key: 'stakeW', type: 'number', label: 'Ancho', default: 7, min: 3, max: 16, step: 0.5, unit: 'mm' },

    ...colorsParams({ max: 2, base: '#2A9D8F', text: '#F5F5F5', baseLabel: 'Cartel y estaca' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Base', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve del texto', default: 1, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const w = v.width, h = v.shape === 'circle' ? v.width : v.height;
    const sign = SHAPES[v.shape].make(w, h, Math.min(5, h / 4));
    const [aw, ah] = AREA[v.shape];
    const text = fitInto(stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 1.5), w * aw, h * ah);
    const sb = sign.bounds();
    const sw = v.stakeW, top = sb.min[1] + Math.min(4, h * 0.15);
    const stake = polygonShape([[-sw / 2, top], [sw / 2, top], [sw / 2, top - v.stakeL + sw], [0, top - v.stakeL], [-sw / 2, top - v.stakeL + sw]]);
    const base = smooth(sign.add(stake), 0.8);
    let top2d = text;
    if (v.frame) top2d = top2d.add(sign.subtract(sign.offset(-1.4, 'Round', 2, 32)));
    return layered({ base2d: base, text2d: top2d, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
