/**
 * Cortador de galletas: desde una forma, un nombre o una imagen.
 * Filo fino arriba, pared más gruesa abajo y faldón ancho para apoyar la mano.
 * Se imprime con el faldón sobre la cama, sin soportes.
 */
import { outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'cortador-galletas',
  title: 'Cortador de galletas',
  description: 'Con forma, nombre o desde imagen. Con filo, refuerzo y faldón.',
  fileName: v => `cortador_${v.source === 'text' ? firstLine(v.text) : v.source === 'shape' ? v.shape : 'imagen'}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'image', options: [{ value: 'image', label: 'Imagen' }, { value: 'shape', label: 'Forma' }, { value: 'text', label: 'Nombre' }] },
    ...imageParams({ showIf: v => v.source === 'image' }),
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: ['heart', 'star', 'circle', 'oval', 'wavy', 'bone', 'fish', 'paw'].map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Sofi', show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo', show: v => v.source === 'text' },
    { key: 'size', type: 'number', label: 'Tamaño (lado más largo)', default: 70, min: 25, max: 200, step: 1, unit: 'mm' },

    { type: 'group', label: 'Cortador' },
    { key: 'height', type: 'number', label: 'Alto total', default: 14, min: 6, max: 40, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.2, min: 0.6, max: 3, step: 0.1, unit: 'mm' },
    { key: 'blade', type: 'number', label: 'Filo (arriba)', default: 0.5, min: 0.4, max: 1.5, step: 0.05, unit: 'mm', hint: 'Usá al menos el ancho de línea de tu boquilla.' },
    { key: 'bladeH', type: 'number', label: 'Alto del filo', default: 3, min: 1, max: 10, step: 0.5, unit: 'mm' },
    { key: 'flange', type: 'number', label: 'Ancho del faldón', default: 4, min: 0, max: 12, step: 0.5, unit: 'mm' },
    { key: 'flangeH', type: 'number', label: 'Alto del faldón', default: 1.6, min: 0.8, max: 5, step: 0.2, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Color', default: '#F77F00' },
  ],
  async build(v, ctx) {
    let shape;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      // Un nombre se corta como una sola silueta: contorno de las letras unidas
      shape = fillHoles(outline(stackLines([{ font, text: v.text || ' ', height: 20 }]), 2));
    } else if (v.source === 'shape') {
      shape = SHAPES[v.shape].make(100, 90);
    } else {
      shape = fillHoles(await silhouette(v, ctx, 100, { fill: true }));
    }
    shape = fillHoles(fitInto(shape, v.size, v.size));
    const lower = v.height - v.bladeH;
    const wallRing = outline(shape, v.wall).subtract(shape);
    const bladeRing = outline(shape, v.blade).subtract(shape);
    const parts = [
      part('Pared', v.color, slab(wallRing, lower)),
      part('Filo', v.color, slab(bladeRing, v.bladeH, lower)),
    ];
    if (v.flange > 0) parts.push(part('Faldón', v.color, slab(outline(shape, v.wall + v.flange).subtract(outline(shape, v.wall * 0.5)), v.flangeH)));
    return mergeByColor(parts);
  },
};
