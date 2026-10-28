/**
 * Lista de códigos QR: varios QR con su etiqueta en una sola placa,
 * en fila o en columna, con base para pararla.
 */
import { roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { qrBlock } from './placa-qr.js';
import { firstLine } from './_common.js';

export function parseEntries(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 6).map(l => {
    const i = l.indexOf('|');
    return i >= 0 ? { label: l.slice(0, i).trim(), link: l.slice(i + 1).trim() } : { label: '', link: l };
  }).filter(e => e.link);
}

export default {
  id: 'lista-qr',
  title: 'Lista de códigos QR',
  description: 'Varios QR con su nombre en una placa vertical u horizontal.',
  fileName: v => `lista_qr_${firstLine(v.title, 'placa')}`,
  params: [
    { type: 'group', label: 'Códigos' },
    { key: 'entries', type: 'text', label: 'Uno por línea: Nombre | link', multiline: true, default: 'Instagram | https://instagram.com/gemelos3d\nWhatsApp | https://wa.me/5491155555555\nWeb | https://gemelos3d.com.ar', hint: 'Hasta 6 códigos.' },
    { key: 'title', type: 'text', label: 'Título', default: 'Gemelos 3D' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins' },
    { key: 'layout', type: 'segment', label: 'Disposición', default: 'row', options: [{ value: 'row', label: 'En fila' }, { value: 'column', label: 'En columna' }] },
    { key: 'qrSize', type: 'number', label: 'Tamaño de cada QR', default: 34, min: 20, max: 80, step: 1, unit: 'mm' },
    { key: 'ecc', type: 'segment', label: 'Resistencia a errores', default: 'M', options: [{ value: 'L', label: 'Baja' }, { value: 'M', label: 'Media' }, { value: 'Q', label: 'Alta' }] },
    { type: 'group', label: 'Colores' },
    { key: 'cBase', type: 'color', label: 'Placa', default: '#1D4ED8' },
    { key: 'cLight', type: 'color', label: 'Fondo de los QR y textos', default: '#F5F5F5' },
    { key: 'cDark', type: 'color', label: 'Cuadraditos', default: '#1E1E1E' },
    { type: 'group', label: 'Espesores y base' },
    { key: 'hBase', type: 'number', label: 'Placa', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'hLayer', type: 'number', label: 'Capas de color', default: 0.6, min: 0.2, max: 2, step: 0.2, unit: 'mm' },
    { key: 'stand', type: 'toggle', label: 'Base con ranura', default: true },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', show: v => v.stand },
  ],
  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const entries = parseEntries(v.entries);
    if (!entries.length) entries.push({ label: '', link: ' ' });
    const S = v.qrSize, gap = 6, labelH = S * 0.16;
    let pads = null, dark = null, text = null;
    const cells = entries.map(e => ({ ...e, qr: qrBlock(e.link, S, v.ecc) }));
    const cw = cells[0].qr.outer, ch = cells[0].qr.outer + labelH + 3;
    cells.forEach((c, i) => {
      const x = v.layout === 'row' ? (i - (cells.length - 1) / 2) * (cw + gap) : 0;
      const y = v.layout === 'row' ? 0 : -(i - (cells.length - 1) / 2) * (ch + gap);
      const p = c.qr.pad.translate([x, y - (labelH + 3) / 2]);
      const d = c.qr.dark.translate([x, y - (labelH + 3) / 2]);
      pads = pads ? pads.add(p) : p; dark = dark ? dark.add(d) : d;
      if (c.label) {
        const t = fitInto(stackLines([{ font, text: c.label, height: 10 }]), cw, labelH).translate([x, y + ch / 2 - labelH / 2]);
        text = text ? text.add(t) : t;
      }
    });
    let b = pads.bounds();
    if ((v.title || '').trim()) {
      const th = Math.max(8, S * 0.28);
      const t = fitInto(stackLines([{ font, text: v.title, height: 10 }]), (b.max[0] - b.min[0]), th).translate([(b.min[0] + b.max[0]) / 2, b.max[1] + labelH + 6 + th / 2]);
      text = text ? text.add(t) : t;
    }
    const all = text ? pads.add(text) : pads;
    b = all.bounds();
    const m = 7, pw = b.max[0] - b.min[0] + 2 * m, ph = b.max[1] - b.min[1] + 2 * m;
    const plate = roundedRect(pw, ph, 6).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2]);
    const h = v.hBase, L = v.hLayer;
    const parts = [
      part('Placa', v.cBase, slab(plate, h)),
      part('Fondo QR', v.cLight, slab(pads, L, h)),
      part('QR', v.cDark, slab(dark, L, h + L)),
    ];
    if (text) parts.push(part('Textos', v.cLight, slab(text, L * 1.5, h)));
    if (v.stand) {
      const base = slotBase({ length: pw + 16, slotLength: pw + 0.6, plate: h, tol: v.tol, depth: Math.max(18, h * 5), height: 12, slotDepth: 6, color: v.cBase });
      parts.push(part('Base', v.cBase, placeBelow(base.solid, slab(plate, h), 10)));
    }
    return mergeByColor(parts);
  },
};
