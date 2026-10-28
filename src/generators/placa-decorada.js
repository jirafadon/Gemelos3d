/**
 * Placa decorada para pararse en una base con ranura.
 * Fondo liso, con rayas o con marco; título y hasta dos líneas más.
 * Base de: placa con rayas y cuadro con marco.
 */
import { wasm, roundedRect, circle, outline, part, slab } from '../engine/geom.js';
import { mergeByColor, slotBase, stackLines, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

function plateShape(kind, w, h) {
  if (kind === 'circle') return circle(w / 2, 128);
  if (kind === 'arch') {
    const r = w / 2, rectH = Math.max(1, h - r);
    return roundedRect(w, rectH, 0).translate([0, -h / 2 + rectH / 2]).add(circle(r, 128).translate([0, -h / 2 + rectH]));
  }
  return roundedRect(w, h, Math.min(w, h) * 0.08);
}

export default {
  id: 'placa-decorada',
  title: 'Placa decorada',
  description: 'Placa con fondo liso, rayas o marco, texto y base para pararla.',
  fileName: v => firstLine(v.title, v.line2),
  params: [
    { type: 'group', label: 'Placa' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'rect', options: [{ value: 'rect', label: 'Rectángulo' }, { value: 'arch', label: 'Arco' }, { value: 'circle', label: 'Círculo' }] },
    { key: 'width', type: 'number', label: 'Ancho', default: 100, min: 40, max: 250, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 100, min: 30, max: 250, step: 1, unit: 'mm', show: v => v.shape !== 'circle' },
    { key: 'bg', type: 'segment', label: 'Fondo', default: 'stripes', options: [{ value: 'plain', label: 'Liso' }, { value: 'stripes', label: 'Rayas' }, { value: 'frame', label: 'Marco' }] },
    { key: 'stripeW', type: 'number', label: 'Ancho de las rayas', default: 3, min: 1, max: 15, step: 0.5, unit: 'mm', show: v => v.bg === 'stripes' },
    { key: 'stripeAngle', type: 'number', label: 'Ángulo de las rayas', default: 0, min: -60, max: 60, step: 5, unit: '°', show: v => v.bg === 'stripes' },
    { key: 'frameW', type: 'number', label: 'Ancho del marco', default: 5, min: 2, max: 20, step: 0.5, unit: 'mm', show: v => v.bg === 'frame' },

    { type: 'group', label: 'Texto' },
    { key: 'title', type: 'text', label: 'Título', default: 'melhor\nPAI\ndo mundo', multiline: true },
    { key: 'titleFont', type: 'font', label: 'Tipografía del título', default: 'pacifico' },
    { key: 'line2', type: 'text', label: 'Línea chica (opcional)', default: '' },
    { key: 'line3', type: 'text', label: 'Otra línea chica (opcional)', default: '' },
    { key: 'smallFont', type: 'font', label: 'Tipografía de las líneas chicas', default: 'poppins', show: v => !!(v.line2 || v.line3) },
    { key: 'textScale', type: 'number', label: 'Tamaño del texto', default: 0.72, min: 0.3, max: 0.95, step: 0.01, unit: '×', hint: 'Qué parte del ancho ocupa el texto.' },

    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 3, options: [{ value: 2, label: '2' }, { value: 3, label: '3' }] },
    { key: 'cBase', type: 'color', label: 'Placa', default: '#1D4ED8' },
    { key: 'cDeco', type: 'color', label: 'Rayas / marco', default: '#4CC9F0', show: v => v.colors === 3 && v.bg !== 'plain' },
    { key: 'cText', type: 'color', label: 'Texto', default: '#F5F5F5' },

    { type: 'group', label: 'Espesores y base' },
    { key: 'hBase', type: 'number', label: 'Placa', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hDeco', type: 'number', label: 'Rayas / marco', default: 0.6, min: 0.2, max: 3, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve del texto', default: 1, min: 0.4, max: 4, step: 0.2, unit: 'mm' },
    { key: 'stand', type: 'toggle', label: 'Base con ranura para pararla', default: true },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', show: v => v.stand },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const [tf, sf] = await Promise.all([ctx.font(v.titleFont), ctx.font(v.smallFont)]);
    const w = v.width, h = v.shape === 'circle' ? v.width : v.height;
    const plate = plateShape(v.shape, w, h);
    const inner = v.bg === 'frame' ? plate.offset(-v.frameW, 'Round', 2, 32) : plate;

    const titleLines = String(v.title || ' ').split('\n').filter(l => l.trim());
    const lines = titleLines.map((t, i) => ({ font: tf, text: t, height: i === 1 && titleLines.length === 3 ? 18 : 10 }));
    if ((v.line2 || '').trim()) lines.push({ font: sf, text: v.line2, height: 5 });
    if ((v.line3 || '').trim()) lines.push({ font: sf, text: v.line3, height: 5 });
    const iw = v.bg === 'frame' ? w - 2 * v.frameW : w, ih = (v.shape === 'circle' ? w : h) - (v.bg === 'frame' ? 2 * v.frameW : 0);
    const text = fitInto(stackLines(lines, 1.6), iw * v.textScale, ih * 0.75);

    const deco = v.colors === 3 ? v.cDeco : v.cText;
    const parts = [part('Placa', v.cBase, slab(plate, v.hBase))];
    if (v.bg === 'stripes') {
      const span = Math.hypot(w, h) * 1.2;
      const bars = [];
      for (let x = -span / 2; x < span / 2; x += v.stripeW * 2) bars.push(CrossSection.square([v.stripeW, span], true).translate([x + v.stripeW / 2, 0]));
      const stripes = CrossSection.union(bars).rotate(v.stripeAngle).intersect(plate.offset(-1.5, 'Round', 2, 32)).subtract(outline(text, 2.5));
      parts.push(part('Rayas', deco, slab(stripes, v.hDeco, v.hBase)));
    } else if (v.bg === 'frame') {
      parts.push(part('Marco', deco, slab(plate.subtract(inner), v.hDeco + v.hText, v.hBase)));
    }
    parts.push(part('Texto', v.cText, slab(text, v.hText, v.hBase)));

    if (v.stand) {
      const pb = plate.bounds();
      const flat = v.shape === 'circle' ? w * 0.45 : w * 0.8;
      // El círculo necesita una lengüeta abajo para entrar en la ranura
      if (v.shape === 'circle') parts.push(part('Placa', v.cBase, slab(roundedRect(flat, 8, 0).translate([0, pb.min[1] - 2]), v.hBase)));
      const solid = mergeByColor(parts).reduce((acc, p) => acc ? acc.add(p.solid) : p.solid, null);
      const base = slotBase({ length: flat + 16, slotLength: flat + 0.6, plate: v.hBase, tol: v.tol, depth: Math.max(18, v.hBase * 4), height: 12, slotDepth: 6, color: v.cBase });
      parts.push(part('Base', v.cBase, placeBelow(base.solid, solid, 10)));
    }
    return mergeByColor(parts);
  },
};
