/**
 * Tablero de metas o rifas: una grilla de casilleros numerados (en relieve) con un
 * título arriba, para tachar, pintar o tapar con calcomanías de raspar.
 */
import { wasm, roundedRect, circle, slab, part, textShape } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'contador-rascar',
  title: 'Tablero de metas o rifas',
  description: 'Grilla de casilleros numerados con título, para metas de ahorro o rifas.',
  fileName: v => `tablero_${firstLine(v.title, 'metas')}`,
  params: [
    { type: 'group', label: 'Casilleros' },
    { key: 'count', type: 'number', label: 'Cantidad', default: 30, min: 4, max: 200, step: 1, unit: '' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 6, min: 2, max: 20, step: 1, unit: '' },
    { key: 'cell', type: 'number', label: 'Tamaño del casillero', default: 20, min: 10, max: 40, step: 0.5, unit: 'mm' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondos' }, { value: 'square', label: 'Cuadrados' }] },
    { key: 'start', type: 'number', label: 'Primer número', default: 1, min: 0, max: 9999, step: 1, unit: '' },
    { key: 'step', type: 'number', label: 'De a cuánto suma', default: 1, min: 1, max: 10000, step: 1, unit: '', hint: 'Ej.: 1000 para una meta de ahorro de a $1000.' },
    { key: 'numFont', type: 'font', label: 'Tipografía de los números', default: 'poppins' },

    { type: 'group', label: 'Título' },
    { key: 'title', type: 'text', label: 'Título', default: 'Meta: viaje', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía del título', default: 'baloo', show: v => !!(v.title || '').trim() },
    { key: 'hang', type: 'toggle', label: 'Agujeros para colgar', default: true },

    { type: 'group', label: 'Colores' },
    { key: 'cPlate', type: 'color', label: 'Placa', default: '#264653' },
    { key: 'cMark', type: 'color', label: 'Números, bordes y título', default: '#E9C46A' },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    const C = v.cell, gap = 2, n = v.count, cols = Math.min(v.cols, n), rows = Math.ceil(n / cols);
    const gw = cols * C + (cols - 1) * gap, gh = rows * C + (rows - 1) * gap;
    const titleH = (v.title || '').trim() ? Math.max(14, C * 0.9) : 0, m = 8;
    const W = gw + 2 * m, H = gh + 2 * m + titleH;
    let plate = roundedRect(W, H, 6);
    if (v.hang) for (const sx of [-1, 1]) plate = plate.subtract(circle(2.2, 24).translate([sx * (W / 2 - 6), H / 2 - 6]));
    const nf = await ctx.font(v.numFont);
    const marks = [];
    const top = H / 2 - m - titleH;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const cx = -gw / 2 + C / 2 + c * (C + gap), cy = top - C / 2 - r * (C + gap);
      const cellShape = v.shape === 'round' ? circle(C / 2, 48) : roundedRect(C, C, C * 0.15);
      marks.push(cellShape.subtract(cellShape.offset(-1, 'Round', 2, 16)).translate([cx, cy]));
      const num = String(v.start + i * v.step);
      marks.push(fitInto(textShape(nf, num, { height: 10 }), C * 0.7, C * 0.42).translate([cx, cy]));
    }
    if (titleH) {
      const tf = await ctx.font(v.font);
      marks.push(fitInto(stackLines(String(v.title).split('\n').map(t => ({ font: tf, text: t, height: 10 })), 1.5), gw, titleH * 0.75).translate([0, H / 2 - m / 2 - titleH / 2 - 1]));
    }
    return mergeByColor([
      part('Placa', v.cPlate, slab(plate, 2.4)),
      part('Números y título', v.cMark, slab(CrossSection.union(marks), 0.8, 2.4)),
    ]);
  },
};
