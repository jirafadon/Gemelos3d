/**
 * Llavero NFC: lleva adentro un hueco cerrado para el tag (disco, cuadrado o tarjeta).
 * Se imprime con una pausa: cuando la impresora llega a la altura indicada,
 * se pone el tag en el hueco y se sigue; las capas de arriba lo dejan encerrado.
 */
import { circle, roundedRect, addRing, slab } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, ringParams, firstLine } from './_common.js';

const TAGS = {
  d25: { label: 'Disco 25 mm', shape: () => circle(12.5 + 0.3, 64), w: 25.6, h: 25.6 },
  d30: { label: 'Disco 30 mm', shape: () => circle(15 + 0.3, 64), w: 30.6, h: 30.6 },
  s25: { label: 'Cuadrado 25 mm', shape: () => roundedRect(25.6, 25.6, 1), w: 25.6, h: 25.6 },
  d13: { label: 'Mini 13 mm', shape: () => circle(6.5 + 0.3, 48), w: 13.6, h: 13.6 },
};
const pauseZ = v => Math.ceil((v.floor + v.tagT + 0.1) / 0.2) * 0.2;

export default {
  id: 'llavero-nfc',
  title: 'Llavero NFC',
  description: 'Llavero con un hueco escondido para un tag NFC, con nombre o ícono arriba.',
  fileName: v => `llavero_nfc_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Tag NFC' },
    { key: 'tag', type: 'select', label: 'Tipo de tag', default: 'd25', options: Object.entries(TAGS).map(([value, t]) => ({ value, label: t.label })) },
    { key: 'tagT', type: 'number', label: 'Espesor del tag', default: 0.8, min: 0.2, max: 3, step: 0.1, unit: 'mm',
      hint: v => `Pausá la impresión en Z = ${pauseZ(v).toFixed(1)} mm, poné el tag y seguí.` },
    { key: 'floor', type: 'number', label: 'Piso debajo del tag', default: 1, min: 0.6, max: 3, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Llavero' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'rect', label: 'Rectangular' }] },
    { key: 'margin', type: 'number', label: 'Borde alrededor del tag', default: 3, min: 1.6, max: 10, step: 0.2, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Texto arriba', default: 'NFC', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins' },

    ...colorsParams({ max: 2, base: '#1D4ED8', text: '#F5F5F5', baseLabel: 'Llavero' }),
    modeParam(),
    { type: 'group', label: 'Espesores' },
    { key: 'cover', type: 'number', label: 'Tapa encima del tag', default: 1.2, min: 0.6, max: 4, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve del texto', default: 0.8, min: 0.4, max: 3, step: 0.2, unit: 'mm' },
    ...ringParams({ def: 'top', options: ['top', 'left', 'right'] }),
  ],

  async build(v, ctx) {
    const tag = TAGS[v.tag];
    const z0 = pauseZ(v) - v.tagT - 0.1;
    const top = pauseZ(v);
    const hBase = top + v.cover;
    const W = tag.w + 2 * v.margin, H = tag.h + 2 * v.margin;
    const body = v.shape === 'round' ? circle(W / 2, 96) : roundedRect(W, H, 4);
    const font = await ctx.font(v.font);
    let text = stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 1.5);
    text = fitInto(text, W * (v.shape === 'round' ? 0.62 : 0.78), H * 0.42);
    const { shape } = addRing(body, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    const parts = layered({ base2d: shape, text2d: text, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase, hText: v.hText });
    // Hueco cerrado para el tag (queda adentro de la base)
    const pocket = slab(tag.shape(), top - z0, z0);
    for (const p of parts) if (p.color === v.cBase || parts.length === 1) p.solid = p.solid.subtract(pocket);
    return parts;
  },
};
