/**
 * Portafotos de mesa: marco con ventana, encastre para la foto y tapa trasera a presión.
 * El marco se imprime con el frente sobre la cama (queda liso y prolijo) y el texto
 * va embutido en ese frente, en otro color. Se para en una base con ranura.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

const SIZES = { '10x15': [100, 150], '9x13': [89, 127], '13x18': [127, 178], '6x9': [60, 90], '5x5': [50, 50] };

export default {
  id: 'portafotos',
  title: 'Portafotos de mesa',
  description: 'Marco para foto con tapa a presión, texto al frente y base para pararlo.',
  fileName: v => `portafotos_${v.size}_${firstLine(v.text, 'marco')}`,
  params: [
    { type: 'group', label: 'Foto' },
    { key: 'size', type: 'select', label: 'Tamaño de la foto', default: '10x15', options: Object.keys(SIZES).map(k => ({ value: k, label: `${k.replace('x', ' × ')} cm` })) },
    { key: 'landscape', type: 'toggle', label: 'Apaisada (acostada)', default: false },
    { key: 'lip', type: 'number', label: 'Cuánto tapa el marco de la foto', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Marco' },
    { key: 'border', type: 'number', label: 'Ancho del marco', default: 14, min: 8, max: 40, step: 0.5, unit: 'mm' },
    { key: 'bottom', type: 'number', label: 'Ancho de abajo (para el texto)', default: 26, min: 8, max: 60, step: 0.5, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 6, min: 0, max: 30, step: 0.5, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Texto abajo', default: 'Mi familia', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'dancing', show: v => !!(v.text || '').trim() },
    { key: 'stand', type: 'toggle', label: 'Base con ranura para pararlo', default: true },
    { key: 'tol', type: 'number', label: 'Holgura de tapa y ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cFrame', type: 'color', label: 'Marco', default: '#7B2CBF' },
    { key: 'cText', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
    { key: 'cBack', type: 'color', label: 'Tapa y base', default: '#F5F5F5' },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    let [pw, ph] = SIZES[v.size];
    if (v.landscape) [pw, ph] = [ph, pw];
    const front = 1.6, photoGap = 0.6, backT = 1.6;
    const total = front + photoGap + backT; // espesor del marco
    const ow = pw + 2 * v.border, oh = ph + v.border + v.bottom;
    const cy = (v.bottom - v.border) / 2; // la foto queda corrida hacia arriba
    const outer = roundedRect(ow, oh, v.radius);
    const photo = CrossSection.square([pw + 0.6, ph + 0.6], true).translate([0, cy]);
    const windowCut = CrossSection.square([pw - 2 * v.lip, ph - 2 * v.lip], true).translate([0, cy]);
    // Frente (abajo, sobre la cama) con ventana + alojamiento de la foto y de la tapa
    let frame = slab(outer.subtract(windowCut), front).add(slab(outer.subtract(photo), total - front, front - 0.01));
    const parts = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      let txt = fitInto(stackLines(String(v.text).split('\n').map(t => ({ font, text: t, height: 10 })), 1.5), ow - 2 * v.border, v.bottom * 0.62);
      txt = txt.translate([0, -oh / 2 + v.bottom / 2]).mirror([1, 0]); // el frente va contra la cama
      const t = slab(txt, 0.6);
      frame = frame.subtract(t);
      parts.push(part('Texto', v.cText, t));
    }
    parts.push(part('Marco', v.cFrame, frame));
    // Tapa trasera: entra a presión detrás de la foto
    const back = slab(CrossSection.square([pw + 0.6 - 2 * v.tol, ph + 0.6 - 2 * v.tol], true), backT)
      .add(slab(roundedRect(16, 6, 3), 1.2, backT - 0.01)); // pestaña para sacarla
    const all = mergeByColor(parts).reduce((a, p) => (a ? a.add(p.solid) : p.solid), null);
    const fb = all.boundingBox();
    parts.push(part('Tapa', v.cBack, back.translate([fb.max[0] + 10 + (pw + 0.6) / 2, cy, 0])));
    if (v.stand) {
      const base = slotBase({ length: Math.min(ow, 120) + 10, slotLength: ow + 0.6, plate: total, tol: v.tol, depth: Math.max(22, total * 5), height: 12, slotDepth: 7, color: v.cBack });
      parts.push(part('Base', v.cBack, placeBelow(base.solid, all, 10)));
    }
    return mergeByColor(parts);
  },
};
