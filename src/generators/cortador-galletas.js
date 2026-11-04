/**
 * Fábrica de cortadores: desde una imagen (PNG, JPG o SVG), una forma o un nombre.
 * - Cortador: filo fino arriba, pared más gruesa abajo y base de refuerzo.
 * - Cortador con sello: el filo más las paredes internas que marcan el dibujo en la masa,
 *   sobre una placa de fondo que deja todo en una sola pieza.
 * - Sello macizo: una placa con el dibujo en relieve (para marcar sin cortar).
 * Se imprime con la base o la placa sobre la cama y el filo hacia arriba, sin soportes.
 */
import { outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

const isImage = v => v.source === 'image';

export default {
  id: 'cortador-galletas',
  title: 'Fábrica de cortadores',
  description: 'Tu logo o dibujo a cortador, cortador con sello o sello macizo. También con forma o nombre.',
  fileName: v => `${v.kind === 'stamp' ? 'sello' : 'cortador'}_${v.source === 'text' ? firstLine(v.text) : v.source === 'shape' ? v.shape : 'imagen'}`,
  params: [
    { type: 'group', label: 'Qué fabricar' },
    { key: 'kind', type: 'segment', label: 'Pieza', default: 'cutter', options: [{ value: 'cutter', label: 'Cortador' }, { value: 'stamped', label: 'Cortador con sello' }, { value: 'stamp', label: 'Sello macizo' }],
      hint: v => ({ cutter: 'Solo el contorno: corta la masa.', stamped: 'El filo exterior más las paredes internas que marcan el dibujo, unidas por una placa de fondo.', stamp: 'Una placa con el dibujo en relieve, para marcar galletitas, fondant o arcilla.' }[v.kind]) },

    { type: 'group', label: 'Imagen o forma' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'image', options: [{ value: 'image', label: 'Imagen' }, { value: 'shape', label: 'Forma' }, { value: 'text', label: 'Nombre' }] },
    ...imageParams({ showIf: isImage }),
    { key: 'mirror', type: 'toggle', label: 'Espejar el dibujo (para que la galleta salga derecha)', default: true, show: v => v.kind !== 'cutter' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: ['heart', 'star', 'circle', 'oval', 'wavy', 'bone', 'fish', 'paw', 'cloudShape', 'flower', 'house', 'shirt', 'balloonShape'].filter(k => SHAPES[k]).map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Sofi', show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo', show: v => v.source === 'text' },

    { type: 'group', label: 'Tamaño' },
    { key: 'size', type: 'number', label: 'Tamaño de la galleta', default: 75, min: 25, max: 220, step: 1, unit: 'mm' },
    { key: 'measure', type: 'segment', label: 'Medido sobre', default: 'long', options: [{ value: 'long', label: 'El lado más largo' }, { value: 'w', label: 'El ancho' }, { value: 'h', label: 'El alto' }] },
    { key: 'height', type: 'number', label: 'Altura del cortador', default: 12, min: 6, max: 40, step: 0.5, unit: 'mm', show: v => v.kind !== 'stamp' },

    { type: 'group', label: 'Filo', show: v => v.kind !== 'stamp' },
    { key: 'blade', type: 'number', label: 'Espesor del filo', default: 0.8, min: 0.4, max: 2, step: 0.05, unit: 'mm', hint: 'Usá al menos el ancho de línea de tu boquilla.', show: v => v.kind !== 'stamp' },
    { key: 'edgePos', type: 'select', label: 'El filo se apoya', default: 'outside', options: [{ value: 'outside', label: 'Por fuera del trazo (galleta a tamaño real)' }, { value: 'center', label: 'Centrado en el trazo' }], show: v => v.kind !== 'stamp' },
    { key: 'wall', type: 'number', label: 'Pared (abajo)', default: 1.4, min: 0.6, max: 3, step: 0.1, unit: 'mm', show: v => v.kind !== 'stamp' },
    { key: 'bladeH', type: 'number', label: 'Alto del filo fino', default: 3, min: 1, max: 10, step: 0.5, unit: 'mm', show: v => v.kind !== 'stamp' },
    { key: 'reinforce', type: 'toggle', label: 'Agregar base de refuerzo', default: true, show: v => v.kind === 'cutter' },
    { key: 'flange', type: 'number', label: 'Ancho de la base', default: 2, min: 0.5, max: 12, step: 0.5, unit: 'mm', show: v => v.kind === 'cutter' && v.reinforce },
    { key: 'flangeH', type: 'number', label: 'Alto de la base', default: 1.6, min: 0.8, max: 5, step: 0.2, unit: 'mm', show: v => v.kind === 'cutter' && v.reinforce },

    { type: 'group', label: 'Placa', show: v => v.kind !== 'cutter' },
    { key: 'plateT', type: 'number', label: 'Espesor de la placa', default: 1.6, min: 0.8, max: 5, step: 0.2, unit: 'mm', show: v => v.kind !== 'cutter' },

    { type: 'group', label: 'Sello', show: v => v.kind !== 'cutter' },
    { key: 'lineW', type: 'number', label: 'Espesor de línea', default: 1, min: 0.4, max: 4, step: 0.05, unit: 'mm', show: v => v.kind === 'stamped' },
    { key: 'markD', type: 'number', label: 'Profundidad de marca', default: 3, min: 0.6, max: 8, step: 0.1, unit: 'mm', show: v => v.kind !== 'cutter' },
    { key: 'edgeGap', type: 'number', label: 'Separación del filo', default: 0.35, min: 0, max: 4, step: 0.05, unit: 'mm', show: v => v.kind === 'stamped', hint: 'Las líneas del sello no tocan el filo, así la masa no se pega.' },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Filo y base', default: '#1565C0' },
    { key: 'color2', type: 'color', label: 'Sello / relieve', default: '#F77F00', show: v => v.kind !== 'cutter' },
  ],

  async build(v, ctx) {
    let shape, art = null;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      const letters = stackLines([{ font, text: v.text || ' ', height: 20 }]);
      // Un nombre se corta como una sola silueta: contorno de las letras unidas
      shape = fillHoles(outline(letters, 2));
      art = letters;
    } else if (v.source === 'shape') {
      shape = SHAPES[v.shape].make(100, 90);
    } else {
      art = await silhouette(v, ctx, 100, { fill: false });
      shape = fillHoles(art);
    }
    // Tamaño: lado largo, ancho o alto
    const b = shape.bounds(), bw = b.max[0] - b.min[0], bh = b.max[1] - b.min[1];
    const k = v.measure === 'w' ? v.size / bw : v.measure === 'h' ? v.size / bh : v.size / Math.max(bw, bh);
    const c = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
    const fit = cs => cs.translate(c).scale([k, k]);
    shape = fillHoles(fit(shape));
    if (art) art = fit(art);
    if (v.kind !== 'cutter' && v.mirror) { shape = shape.mirror([1, 0]); if (art) art = art.mirror([1, 0]); }

    const parts = [];
    if (v.kind === 'stamp') {
      // Sello macizo: placa con la silueta y el dibujo en relieve
      const plate = outline(shape, 1.5);
      parts.push(part('Placa', v.color, slab(plate, v.plateT)));
      const relief = (art || shape).intersect(shape);
      parts.push(part('Relieve', v.color2, slab(relief, v.markD, v.plateT)));
      return mergeByColor(parts);
    }

    // Filo: por fuera del trazo (la galleta sale del tamaño pedido) o centrado
    const inner = v.edgePos === 'center' ? shape.offset(-v.blade / 2, 'Round', 2, 24) : shape;
    const H = v.height;
    const base = v.kind === 'stamped' ? v.plateT : 0;
    const lower = Math.max(0.6, H - v.bladeH - base);
    const wallRing = outline(inner, v.wall).subtract(inner);
    const bladeRing = outline(inner, v.blade).subtract(inner);
    parts.push(part('Pared', v.color, slab(wallRing, lower + base)));
    parts.push(part('Filo', v.color, slab(bladeRing, v.bladeH, lower + base)));

    if (v.kind === 'cutter') {
      if (v.reinforce) parts.push(part('Base', v.color, slab(outline(inner, v.wall + v.flange).subtract(outline(inner, v.wall * 0.5)), v.flangeH)));
      return mergeByColor(parts);
    }

    // Cortador con sello: placa de fondo + paredes internas con las líneas del dibujo
    parts.push(part('Placa', v.color, slab(inner, base)));
    if (art) {
      const lw = v.lineW / 2;
      const lines = art.offset(lw, 'Round', 2, 16).subtract(art.offset(-lw, 'Round', 2, 16));
      const room = inner.offset(-(v.edgeGap + lw), 'Round', 2, 16);
      const stamp = lines.intersect(room);
      if (!stamp.isEmpty()) parts.push(part('Sello', v.color2, slab(stamp, Math.min(v.markD, H - base - 0.5), base)));
    }
    return mergeByColor(parts);
  },
};
