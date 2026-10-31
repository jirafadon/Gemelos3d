/**
 * Placa de mascota: hueso, pez, óvalo, ondulada, corazón o círculo,
 * con nombre y un dato (teléfono) que se ajustan solos a la forma.
 */
import { addRing, circle } from '../engine/geom.js';
import { layered, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { colorsParams, modeParam, thicknessParams, firstLine, textPlaceParams, placeText } from './_common.js';

// Zona útil para el texto dentro de cada forma: [ancho, alto, corrimiento x, corrimiento y] en proporción.
const TEXT_AREA = {
  bone: [0.6, 0.42, 0, 0],
  fish: [0.5, 0.5, 0.1, 0],
  oval: [0.72, 0.56, 0, 0],
  wavy: [0.68, 0.52, 0, 0],
  circle: [0.66, 0.5, 0, 0],
  heart: [0.58, 0.42, 0, 0.08],
};

export default {
  id: 'placa-mascota',
  title: 'Placa de mascota',
  description: 'Hueso, pez, ovalada, ondulada, corazón o círculo, con nombre y teléfono.',
  fileName: v => `placa_${firstLine(v.name)}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'bone', options: Object.keys(TEXT_AREA).map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'width', type: 'number', label: 'Ancho', default: 42, min: 20, max: 90, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 24, min: 14, max: 80, step: 1, unit: 'mm', show: v => v.shape !== 'circle' },

    { type: 'group', label: 'Texto' },
    { key: 'name', type: 'text', label: 'Nombre', default: 'Luigi' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },
    { key: 'info', type: 'text', label: 'Teléfono u otro dato', default: '11 5555-5555' },
    { key: 'infoSize', type: 'number', label: 'Tamaño del dato', default: 0.32, min: 0.15, max: 0.7, step: 0.01, unit: '×', hint: 'Proporción respecto del nombre.' },
    { key: 'frame', type: 'toggle', label: 'Borde del color del texto', default: true },
    { key: 'frameW', type: 'number', label: 'Ancho del borde', default: 1.4, min: 0.8, max: 4, step: 0.1, unit: 'mm', show: v => v.frame },

    ...colorsParams({ max: 2, base: '#7B2CBF', text: '#F5F5F5', baseLabel: 'Placa' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 1 }),

    ...textPlaceParams(),
    { type: 'group', label: 'Argolla' },
    { key: 'ring', type: 'segment', label: 'Posición', default: 'top', options: [{ value: 'top', label: 'Arriba' }, { value: 'left', label: 'Izquierda' }, { value: 'inside', label: 'Agujero adentro' }] },
    { key: 'holeD', type: 'number', label: 'Diámetro del agujero', default: 3.5, min: 2, max: 8, step: 0.5, unit: 'mm' },
  ],

  async build(v, ctx) {
    const font = await ctx.font(v.font);
    const w = v.width, h = v.shape === 'circle' ? v.width : v.height;
    const shape = SHAPES[v.shape].make(w, h);
    const [aw, ah, ax, ay] = TEXT_AREA[v.shape];
    const lines = [{ font, text: v.name || ' ', height: 10 }];
    if ((v.info || '').trim()) lines.push({ font, text: v.info, height: 10 * v.infoSize });
    const text = placeText(fitInto(stackLines(lines, 1.2), w * aw, h * ah).translate([w * ax, h * ay]), v, shape);

    let top = text;
    if (v.frame) top = top.add(shape.subtract(shape.offset(-v.frameW, 'Round', 2, 32)));

    let base = shape;
    if (v.ring === 'inside') {
      const r = v.holeD / 2;
      const hole = circle(r).translate(
        v.shape === 'bone' ? [-w / 2 + h * 0.3, h / 2 - h * 0.3]
          : v.shape === 'fish' ? [w * 0.3, h * 0.18]
            : v.shape === 'heart' ? [-w * 0.24, h * 0.22]
            : [0, h / 2 - r - (v.frame ? v.frameW : 0) - 1.6]);
      base = base.subtract(hole);
      top = top.subtract(hole.offset(1, 'Round', 2, 24));
    } else {
      base = addRing(shape, { side: v.ring, holeD: v.holeD, wall: 2.2 }).shape;
    }
    return layered({ base2d: base, text2d: top, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
