/**
 * QR 3D: el código suelto, como llavero o con una etiqueta abajo.
 */
import { roundedRect, addRing } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { qrBlock, payloadOf, contentParams } from './placa-qr.js';
import { modeParam, firstLine } from './_common.js';

export default {
  id: 'qr-3d',
  title: 'QR 3D',
  description: 'Código QR imprimible suelto o como llavero, con etiqueta opcional.',
  fileName: v => `qr_${firstLine(v.label, 'llavero')}`,
  params: [
    ...contentParams('link'),
    { type: 'group', label: 'Pieza' },
    { key: 'qrSize', type: 'number', label: 'Tamaño del QR', default: 30, min: 15, max: 120, step: 1, unit: 'mm' },
    { key: 'label', type: 'text', label: 'Etiqueta abajo (opcional)', default: 'Mi web' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => !!(v.label || '').trim() },
    { key: 'ring', type: 'segment', label: 'Argolla', default: 'top', options: [{ value: 'top', label: 'Arriba' }, { value: 'left', label: 'Izquierda' }, { value: 'none', label: 'Sin argolla' }] },
    { type: 'group', label: 'Colores y espesor' },
    { key: 'colors', type: 'segment', label: 'Cantidad de colores', default: 2, options: [{ value: 2, label: '2' }] , hint: 'Un QR necesita dos colores para leerse.' },
    { key: 'cBase', type: 'color', label: 'Fondo', default: '#F5F5F5' },
    { key: 'cText', type: 'color', label: 'Cuadraditos y texto', default: '#1E1E1E' },
    modeParam(),
    { key: 'hBase', type: 'number', label: 'Espesor', default: 2.4, min: 1.2, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Relieve', default: 0.6, min: 0.2, max: 2, step: 0.2, unit: 'mm' },
  ],
  async build(v, ctx) {
    const qr = qrBlock(payloadOf(v), v.qrSize, v.ecc);
    let tile = qr.pad, top = qr.dark;
    if ((v.label || '').trim()) {
      const font = await ctx.font(v.font);
      const lh = Math.max(4, v.qrSize * 0.16);
      const t = fitInto(stackLines([{ font, text: v.label, height: 10 }]), qr.outer - 4, lh).translate([0, -qr.outer / 2 - lh / 2 - 1]);
      tile = roundedRect(qr.outer, qr.outer + lh + 3, Math.min(3, qr.outer * 0.08)).translate([0, -(lh + 3) / 2]);
      top = top.add(t);
    }
    const { shape } = addRing(tile, { side: v.ring, holeD: 4, wall: 2.4 });
    return layered({ base2d: shape, text2d: top, colors: 2, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
