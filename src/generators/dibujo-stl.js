/**
 * De dibujo a STL: una imagen (logo, dibujo, silueta) convertida en pieza,
 * sola o en relieve sobre una placa con su contorno.
 */
import { outline, fillHoles, roundedRect, ellipse, addRing, part, slab } from '../engine/geom.js';
import { layered } from '../engine/layers.js';
import { imageParams, silhouette, colorsParams, modeParam, thicknessParams, ringParams } from './_common.js';

export default {
  id: 'dibujo-stl',
  title: 'De dibujo a STL',
  description: 'Logo, dibujo o silueta a pieza imprimible, con placa base opcional.',
  fileName: () => 'dibujo',
  params: [
    { type: 'group', label: 'Imagen' },
    ...imageParams(),
    { key: 'width', type: 'number', label: 'Ancho del dibujo', default: 60, min: 10, max: 250, step: 1, unit: 'mm' },
    { key: 'fillSil', type: 'toggle', label: 'Rellenar huecos del dibujo', default: false },

    { type: 'group', label: 'Placa' },
    { key: 'plate', type: 'segment', label: 'Placa de fondo', default: 'contour', options: [{ value: 'none', label: 'Sin placa' }, { value: 'contour', label: 'Contorno' }, { value: 'rect', label: 'Rectángulo' }, { value: 'oval', label: 'Óvalo' }] },
    { key: 'border', type: 'number', label: 'Margen / contorno', default: 3, min: 0.8, max: 20, step: 0.2, unit: 'mm', show: v => v.plate !== 'none' },

    ...colorsParams({ max: 2, base: '#1E1E1E', text: '#F5F5F5', baseLabel: 'Placa' }),
    modeParam(),
    ...thicknessParams({ base: 3, relief: 1.2 }),
    ...ringParams({ def: 'none' }),
  ],
  async build(v, ctx) {
    const sil = await silhouette(v, ctx, v.width, { fill: v.fillSil });
    if (v.plate === 'none') {
      const { shape } = addRing(sil, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
      return [part('Dibujo', v.colors === 1 ? v.cBase : v.cText, slab(shape, v.hBase + v.hText))];
    }
    const b = sil.bounds();
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1];
    let plate = v.plate === 'contour' ? fillHoles(outline(sil, v.border))
      : v.plate === 'rect' ? roundedRect(w + 2 * v.border, h + 2 * v.border, Math.min(6, v.border * 1.5))
        : ellipse((w + 2 * v.border) * 1.15, (h + 2 * v.border) * 1.15);
    const { shape } = addRing(plate, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    return layered({ base2d: shape, text2d: sil, colors: v.colors, mode: v.mode, cBase: v.cBase, cText: v.cText, hBase: v.hBase, hText: v.hText });
  },
};
