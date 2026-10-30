/**
 * Tarjeta de presentación con QR (85 × 55 mm) y soporte para exhibirla.
 */
import { roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { qrBlock, payloadOf, contentParams } from './placa-qr.js';
import { firstLine } from './_common.js';

export default {
  id: 'tarjeta-presentacion',
  title: 'Tarjeta de presentación',
  description: 'Tarjeta con QR, nombre y datos, y soporte para exhibir.',
  fileName: v => `tarjeta_${firstLine(v.name)}`,
  params: [
    ...contentParams('link'),
    { type: 'group', label: 'Datos' },
    { key: 'name', type: 'text', label: 'Nombre o marca', default: 'Gemelos 3D' },
    { key: 'nameFont', type: 'font', label: 'Tipografía del nombre', default: 'poppins' },
    { key: 'info', type: 'text', label: 'Datos (una línea cada uno)', multiline: true, default: 'Impresión 3D a medida\n@3dgemelos\ngemelos3d.com.ar' },
    { key: 'infoFont', type: 'font', label: 'Tipografía de los datos', default: 'poppins' },
    { type: 'group', label: 'Tarjeta' },
    { key: 'width', type: 'number', label: 'Ancho', default: 85, min: 60, max: 140, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 55, min: 40, max: 100, step: 1, unit: 'mm' },
    { key: 'cBase', type: 'color', label: 'Tarjeta', default: '#7B2CBF' },
    { key: 'cLight', type: 'color', label: 'Fondo del QR y textos', default: '#F5F5F5' },
    { key: 'cDark', type: 'color', label: 'Cuadraditos', default: '#1E1E1E' },
    { key: 'hBase', type: 'number', label: 'Espesor', default: 2, min: 1.2, max: 5, step: 0.2, unit: 'mm' },
    { key: 'stand', type: 'toggle', label: 'Soporte para exhibirla', default: true },
  ],
  async build(v, ctx) {
    const [nf, inf] = await Promise.all([ctx.font(v.nameFont), ctx.font(v.infoFont)]);
    const W = v.width, H = v.height, m = 5;
    const S = H - 2 * m - 5;
    const qr = qrBlock(payloadOf(v), S, v.ecc || 'M');
    const scale = S / qr.outer; // el bloque con margen entra en el alto
    const qx = W / 2 - m - (qr.outer * scale) / 2;
    const pad = qr.pad.scale(scale).translate([qx, 0]), dark = qr.dark.scale(scale).translate([qx, 0]);
    const textW = W - 3 * m - qr.outer * scale, tx = -W / 2 + m + textW / 2;
    const lines = [{ font: nf, text: v.name || ' ', height: 10 }, ...String(v.info || '').split('\n').filter(Boolean).map(t => ({ font: inf, text: t, height: 4.6 }))];
    const text = fitInto(stackLines(lines, 2.4, 'left'), textW, H - 2 * m).translate([tx, 0]);
    const card = roundedRect(W, H, 4);
    const h = v.hBase, L = 0.6;
    const parts = [
      part('Tarjeta', v.cBase, slab(card, h)),
      part('Fondo QR', v.cLight, slab(pad, L, h)),
      part('QR', v.cDark, slab(dark, L, h + L)),
      part('Textos', v.cLight, slab(text, L, h)),
    ];
    if (v.stand) {
      const base = slotBase({ length: W + 12, slotLength: W + 0.6, plate: h, tol: 0.25, depth: 16, height: 10, slotDepth: 5, color: v.cBase });
      parts.push(part('Soporte', v.cBase, placeBelow(base.solid, slab(card, h), 10)));
    }
    return mergeByColor(parts);
  },
};
