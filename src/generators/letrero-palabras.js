/**
 * Letrero de texto en capas: hasta 3 líneas (cada una con su tipografía),
 * fondo con la forma del texto, rectángulo u óvalo, pie plano para pararse
 * y corazón opcional. Base de: letrero @usuario, letras separadas y palabra con corazón.
 */
import { roundedRect, ellipse, outline, fillHoles } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { heart, smooth } from '../engine/shapes.js';
import { colorsParams, modeParam, thicknessParams, firstLine } from './_common.js';

const lineParams = (n, text, font, size, optional) => [
  { key: `text${n}`, type: 'text', label: optional ? `Línea ${n} (opcional)` : `Línea ${n}`, default: text },
  { key: `font${n}`, type: 'font', label: `Tipografía línea ${n}`, default: font, show: optional ? v => !!(v[`text${n}`] || '').trim() : undefined },
  { key: `size${n}`, type: 'number', label: `Alto línea ${n}`, default: size, min: 5, max: 120, step: 0.5, unit: 'mm', show: optional ? v => !!(v[`text${n}`] || '').trim() : undefined },
];

export default {
  id: 'letrero-palabras',
  title: 'Letrero de palabras superpuestas',
  description: 'Dos o tres palabras encimadas en 2 o 3 colores, con pie para pararlo.',
  fileName: v => firstLine(v.text1, v.text2),
  params: [
    { type: 'group', label: 'Texto' },
    ...lineParams(1, 'Pietra', 'lobster', 26),
    ...lineParams(2, 'Manuela', 'dancing', 16, true),
    ...lineParams(3, '', 'poppins', 10, true),
    { key: 'gap', type: 'number', label: 'Separación entre líneas', default: -5, min: -20, max: 15, step: 0.5, unit: 'mm', hint: 'Negativo para encimar las palabras.' },
    { key: 'spacing', type: 'number', label: 'Espaciado entre letras', default: 0, min: -0.15, max: 0.5, step: 0.01, unit: 'em' },
    { key: 'heart', type: 'segment', label: 'Corazón', default: 'none', options: [{ value: 'none', label: 'Sin corazón' }, { value: 'end', label: 'Al final' }, { value: 'start', label: 'Al principio' }] },

    { type: 'group', label: 'Fondo' },
    { key: 'bg', type: 'segment', label: 'Forma del fondo', default: 'contour', options: [{ value: 'contour', label: 'Contorno' }, { value: 'rect', label: 'Rectángulo' }, { value: 'oval', label: 'Óvalo' }] },
    { key: 'border', type: 'number', label: 'Ancho del contorno', default: 3, min: 0.8, max: 12, step: 0.1, unit: 'mm' },
    { key: 'border2', type: 'number', label: 'Ancho del contorno medio', default: 2, min: 0.6, max: 8, step: 0.1, unit: 'mm', show: v => v.colors === 3 },
    { key: 'fill', type: 'toggle', label: 'Rellenar huecos del contorno', default: true, show: v => v.bg === 'contour' },
    { key: 'pad', type: 'number', label: 'Margen alrededor del texto', default: 6, min: 2, max: 30, step: 0.5, unit: 'mm', show: v => v.bg !== 'contour' },
    { key: 'foot', type: 'toggle', label: 'Pie plano para pararlo', default: true, show: v => v.bg === 'contour' },
    { key: 'footH', type: 'number', label: 'Alto del pie', default: 5, min: 2, max: 20, step: 0.5, unit: 'mm', show: v => v.bg === 'contour' && v.foot },

    ...colorsParams({ max: 3, def: 3, base: '#7B2CBF', mid: '#C8B6FF', text: '#F5F5F5' }),
    modeParam(),
    ...thicknessParams({ base: 6, mid: 1, relief: 1.4, maxBase: 20 }),
  ],

  async build(v, ctx) {
    const fonts = await Promise.all([v.font1, v.font2, v.font3].map(f => ctx.font(f)));
    let text = stackLines([1, 2, 3].map((n, i) => ({ font: fonts[i], text: n === 1 ? (v.text1 || ' ') : v[`text${n}`], height: v[`size${n}`], spacing: v.spacing })), v.gap);
    if (v.heart !== 'none') {
      const b = text.bounds();
      const hs = Math.max(6, v.size1 * 0.55);
      const x = v.heart === 'end' ? b.max[0] + hs * 0.46 : b.min[0] - hs * 0.46;
      text = text.add(heart(hs, hs * 0.9).translate([x, (b.max[1] + b.min[1]) / 2 + v.size1 * 0.1]));
    }
    const colors = Number(v.colors);
    const total = v.border + (colors === 3 ? v.border2 : 0);
    let base, mid = null;
    if (v.bg === 'contour') {
      base = outline(text, total);
      if (v.fill) base = fillHoles(base);
      if (v.foot) {
        const b = base.bounds();
        const w = (b.max[0] - b.min[0]) * 0.86;
        base = smooth(base.add(roundedRect(w, v.footH * 2, 0).translate([(b.min[0] + b.max[0]) / 2, b.min[1] + v.footH * 0.4])), 1.2);
        // Corta lo que asoma por debajo para dejar la base perfectamente plana
        const nb = base.bounds();
        base = base.intersect(roundedRect(nb.max[0] - nb.min[0] + 2, nb.max[1] - nb.min[1], 0).translate([(nb.min[0] + nb.max[0]) / 2, (nb.min[1] + nb.max[1]) / 2 + v.footH * 0.6]));
      }
      if (colors === 3) { mid = outline(text, v.border); if (v.fill) mid = fillHoles(mid); }
    } else {
      const b = text.bounds();
      const w = b.max[0] - b.min[0] + 2 * v.pad, h = b.max[1] - b.min[1] + 2 * v.pad;
      base = v.bg === 'rect' ? roundedRect(w, h, Math.min(8, h / 4)) : ellipse(w * 1.12, h * 1.25);
      if (colors === 3) mid = base.offset(-v.border2, 'Round', 2, 32);
    }
    return layered({ base2d: base, mid2d: mid, text2d: text, colors, mode: v.mode, cBase: v.cBase, cMid: v.cMid, cText: v.cText, hBase: v.hBase, hMid: v.hMid, hText: v.hText });
  },
};
