/**
 * Llavero / placa rectangular con una o dos líneas de texto.
 * También es la base del "Llavero nombre y apellido".
 */
import { roundedRect, addRing } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { colorsParams, modeParam, thicknessParams, ringParams, firstLine, textPlaceParams, placeText } from './_common.js';

export default {
  id: 'llavero-rectangular',
  title: 'Llavero rectangular',
  description: 'Placa rectangular con nombre en relieve o al ras, borde opcional y argolla.',
  fileName: v => firstLine(v.line1, v.line2),
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'line1', type: 'text', label: 'Línea principal', default: 'Elisa' },
    { key: 'font1', type: 'font', label: 'Tipografía principal', default: 'fredoka' },
    { key: 'size1', type: 'number', label: 'Alto de la línea principal', default: 12, min: 4, max: 50, step: 0.5, unit: 'mm' },
    { key: 'line2', type: 'text', label: 'Segunda línea (opcional)', default: '' },
    { key: 'font2', type: 'font', label: 'Tipografía de la segunda línea', default: 'poppins', show: v => !!(v.line2 || '').trim() },
    { key: 'size2', type: 'number', label: 'Alto de la segunda línea', default: 6, min: 3, max: 40, step: 0.5, unit: 'mm', show: v => !!(v.line2 || '').trim() },
    { key: 'gap', type: 'number', label: 'Separación entre líneas', default: 2, min: -4, max: 10, step: 0.2, unit: 'mm', show: v => !!(v.line2 || '').trim() },

    ...textPlaceParams(),
    { type: 'group', label: 'Placa' },
    { key: 'padX', type: 'number', label: 'Margen a los costados', default: 5, min: 1, max: 20, step: 0.5, unit: 'mm' },
    { key: 'padY', type: 'number', label: 'Margen arriba y abajo', default: 4, min: 1, max: 20, step: 0.5, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 4, min: 0, max: 20, step: 0.5, unit: 'mm' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },
    { key: 'frameW', type: 'number', label: 'Ancho del borde', default: 1.6, min: 0.8, max: 5, step: 0.1, unit: 'mm', show: v => v.frame },

    ...colorsParams({ max: 2, base: '#7B2CBF', text: '#F5F5F5', baseLabel: 'Placa' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 1 }),
    ...ringParams({ def: 'left' }),
  ],

  async build(v, ctx) {
    const [f1, f2] = await Promise.all([ctx.font(v.font1), ctx.font(v.font2)]);
    const text = stackLines([
      { font: f1, text: v.line1 || ' ', height: v.size1 },
      { font: f2, text: v.line2, height: v.size2 },
    ], v.gap);
    const b = text.bounds();
    const w = b.max[0] - b.min[0] + 2 * v.padX, h = b.max[1] - b.min[1] + 2 * v.padY;
    let plate = roundedRect(w, h, v.radius);
    let top = placeText(text, v, plate);
    if (v.frame) top = top.add(plate.subtract(plate.offset(-v.frameW, 'Round', 2, 32)));
    const { shape } = addRing(plate, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    return layered({ base2d: shape, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
