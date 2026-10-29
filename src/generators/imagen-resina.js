/**
 * Molde abierto para resina: lo oscuro de la imagen queda como cavidad y lo demás
 * (contorno y huecos del dibujo) como paredes altas. Se rellena con resina, glitter
 * o yeso y queda una pieza enmarcada (o se desmolda si se imprime en TPU).
 */
import { outline, fillHoles, roundedRect, addRing, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { imageParams, silhouette, ringParams } from './_common.js';

export default {
  id: 'imagen-resina',
  title: 'Imagen con bordes altos para resina',
  description: 'Molde abierto: el dibujo queda hundido para rellenar con resina o glitter.',
  fileName: () => 'molde_resina',
  params: [
    { type: 'group', label: 'Imagen' },
    ...imageParams(),
    { key: 'width', type: 'number', label: 'Ancho del dibujo', default: 70, min: 20, max: 220, step: 1, unit: 'mm' },
    { key: 'minGap', type: 'number', label: 'Pared mínima entre zonas', default: 0.8, min: 0.4, max: 3, step: 0.1, unit: 'mm', hint: 'Las paredes interiores más finas que esto se eliminan.' },

    { type: 'group', label: 'Molde' },
    { key: 'shape', type: 'segment', label: 'Borde exterior', default: 'contour', options: [{ value: 'contour', label: 'Contorno' }, { value: 'rect', label: 'Rectángulo' }] },
    { key: 'wall', type: 'number', label: 'Borde exterior', default: 2.4, min: 1.2, max: 10, step: 0.2, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Profundidad para la resina', default: 2.5, min: 0.8, max: 10, step: 0.1, unit: 'mm' },
    { key: 'floor', type: 'number', label: 'Piso', default: 1.6, min: 0.8, max: 5, step: 0.2, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color del molde', default: '#BE185D' },
    { key: 'preview', type: 'toggle', label: 'Mostrar la resina (para ver cómo queda)', default: true },
    { key: 'cResin', type: 'color', label: 'Color de la resina', default: '#4CC9F0', show: v => v.preview },
    ...ringParams({ def: 'none' }),
  ],
  async build(v, ctx) {
    let cavity = await silhouette(v, ctx, v.width, { fill: false });
    // Quita paredes interiores demasiado finas para imprimirse
    cavity = cavity.offset(v.minGap / 2, 'Round', 2, 16).offset(-v.minGap / 2, 'Round', 2, 16);
    const b = cavity.bounds();
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1];
    const outer = v.shape === 'contour' ? fillHoles(outline(cavity, v.wall)) : roundedRect(w + 2 * v.wall, h + 2 * v.wall, Math.min(5, v.wall * 2));
    const { shape } = addRing(outer, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    const mold = slab(shape, v.floor + v.depth).subtract(slab(cavity, v.depth + 1, v.floor));
    const parts = [part('Molde', v.color, mold)];
    if (v.preview) parts.push(part('Resina (vista previa)', v.cResin, slab(cavity, v.depth * 0.9, v.floor)));
    return mergeByColor(parts);
  },
};
