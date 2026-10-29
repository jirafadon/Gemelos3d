/**
 * Peine con nombre: dientes a medida (finos, anchos o mixto) y mango con el nombre
 * en relieve en otro color. Plano, se imprime acostado.
 */
import { wasm, roundedRect, circle, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, smooth } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'peines',
  title: 'Peine con nombre',
  description: 'Peine con dientes a medida y el nombre en el mango.',
  fileName: v => `peine_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Peine' },
    { key: 'style', type: 'segment', label: 'Estilo', default: 'handle', options: [{ value: 'handle', label: 'Con mango' }, { value: 'pocket', label: 'De bolsillo' }] },
    { key: 'length', type: 'number', label: 'Largo total', default: 170, min: 80, max: 240, step: 1, unit: 'mm' },
    { key: 'teethL', type: 'number', label: 'Largo de los dientes', default: 22, min: 8, max: 45, step: 0.5, unit: 'mm' },
    { key: 'teethType', type: 'segment', label: 'Dientes', default: 'mixed', options: [{ value: 'fine', label: 'Finos' }, { value: 'wide', label: 'Anchos' }, { value: 'mixed', label: 'Mitad y mitad' }] },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3.2, min: 2, max: 6, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Nombre' },
    { key: 'text', type: 'text', label: 'Nombre en el mango', default: 'Valen' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Peine', default: '#F72585' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    // Coordenadas: el peine corre a lo largo de X (0 → largo); los dientes apuntan hacia Y = 0
    const L = v.length, tl = v.teethL, spineH = 12;
    const handleL = v.style === 'handle' ? L * 0.38 : 0;
    const t0 = handleL + 3, t1 = L - 3; // zona de dientes
    let body = roundedRect(L - handleL + 2, spineH, 3).translate([(handleL - 2 + L) / 2, tl + spineH / 2 - 0.01]);
    let hy0 = tl * 0.35, hy1 = tl + spineH;
    if (handleL) body = body.add(roundedRect(handleL + 4, hy1 - hy0, Math.min(10, (hy1 - hy0) / 2.2)).translate([(handleL + 4) / 2, (hy0 + hy1) / 2]));
    const teeth = [];
    const mid = (t0 + t1) / 2;
    for (let x = t0; ;) {
      const fine = v.teethType === 'fine' || (v.teethType === 'mixed' && x > mid);
      const tw = fine ? 1.4 : 2.2, gap = fine ? 1.2 : 2.6;
      if (x + tw > t1) break;
      teeth.push(CrossSection.square([tw, tl - tw / 2 + 0.5], false).translate([x, tw / 2]).add(circle(tw / 2, 16).translate([x + tw / 2, tw / 2])));
      x += tw + gap;
    }
    let comb = smooth(body.add(CrossSection.union(teeth)), 0.3);
    if (v.style === 'pocket') comb = comb.subtract(circle(2.5, 32).translate([L - 7, tl + spineH / 2]));
    const cb = comb.bounds();
    comb = comb.translate([-(cb.min[0] + cb.max[0]) / 2, -(cb.min[1] + cb.max[1]) / 2]);
    const shift = [-(cb.min[0] + cb.max[0]) / 2, -(cb.min[1] + cb.max[1]) / 2];
    const parts = [part('Peine', v.color, slab(comb, v.thick))];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const [zx, zy, zw, zh] = handleL ? [handleL / 2 + 1, (hy0 + hy1) / 2, handleL * 0.8, (hy1 - hy0) * 0.55] : [(t0 + t1) / 2, tl + spineH / 2, (t1 - t0) * 0.6, spineH * 0.7];
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }], 0), zw, zh).translate([zx + shift[0], zy + shift[1]]);
      const t = txt.intersect(comb.offset(-1, 'Round', 2, 16));
      if (!t.isEmpty()) parts.push(part('Nombre', v.cText, slab(t, 0.8, v.thick)));
    }
    return mergeByColor(parts);
  },
};
