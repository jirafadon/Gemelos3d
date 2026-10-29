/**
 * Para colorear: un dibujo de líneas (lo oscuro de la imagen) queda en relieve
 * sobre una placa, como paredes, para pintar adentro con marcadores o resina.
 */
import { roundedRect, outline, fillHoles, addRing } from '../engine/geom.js';
import { layered } from '../engine/layers.js';
import { imageParams, silhouette, colorsParams, ringParams } from './_common.js';

export default {
  id: 'colorear',
  title: 'Para colorear',
  description: 'Dibujo de líneas en relieve sobre una placa, para pintar adentro.',
  fileName: () => 'para_colorear',
  params: [
    { type: 'group', label: 'Dibujo' },
    ...imageParams({ label: 'Dibujo de líneas (fondo blanco)' }),
    { key: 'width', type: 'number', label: 'Ancho', default: 100, min: 30, max: 250, step: 1, unit: 'mm' },
    { key: 'thicken', type: 'number', label: 'Engrosar las líneas', default: 0.4, min: 0, max: 2, step: 0.1, unit: 'mm', hint: 'Las líneas deberían quedar de 0,8 mm o más para que se impriman.' },

    { type: 'group', label: 'Placa' },
    { key: 'plate', type: 'segment', label: 'Forma de la placa', default: 'rect', options: [{ value: 'rect', label: 'Rectángulo' }, { value: 'contour', label: 'Contorno del dibujo' }] },
    { key: 'margin', type: 'number', label: 'Margen', default: 6, min: 2, max: 30, step: 0.5, unit: 'mm' },
    { key: 'frame', type: 'toggle', label: 'Borde alrededor', default: true },

    ...colorsParams({ max: 2, base: '#F5F5F5', text: '#1E1E1E', baseLabel: 'Placa' }),
    { type: 'group', label: 'Espesores' },
    { key: 'hBase', type: 'number', label: 'Placa', default: 2, min: 1, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hText', type: 'number', label: 'Alto de las líneas', default: 1.6, min: 0.6, max: 5, step: 0.2, unit: 'mm' },
    ...ringParams({ def: 'none' }),
  ],
  async build(v, ctx) {
    let lines = await silhouette(v, ctx, v.width, { fill: false });
    // Sin imagen subida, el ejemplo se muestra como dibujo de contorno (como un libro para pintar)
    if (!v.image) lines = lines.subtract(lines.offset(-1.2, 'Round', 2, 16));
    if (v.thicken > 0) lines = lines.offset(v.thicken / 2, 'Round', 2, 16);
    const b = lines.bounds();
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1];
    const plate = v.plate === 'contour' ? fillHoles(outline(lines, v.margin)) : roundedRect(w + 2 * v.margin, h + 2 * v.margin, Math.min(6, v.margin));
    let top = lines;
    if (v.frame) top = top.add(plate.subtract(plate.offset(-1.6, 'Round', 2, 32)));
    const { shape } = addRing(plate, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    return layered({ base2d: shape, text2d: top, colors: v.colors, mode: 'raised', cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
