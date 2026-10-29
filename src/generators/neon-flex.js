/**
 * Base para neón flex: una placa con un canal en U donde se encastra la manguera de neón.
 * El canal sigue el contorno de un texto o forma ("Contorno"), o las líneas de un dibujo
 * de línea simple ("Desde dibujo"). Con agujeros para colgar y salida de cable.
 */
import { wasm, roundedRect, circle, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'neon-flex',
  title: 'Base para neón flex',
  description: 'Placa con canal para manguera de neón flex siguiendo un texto, forma o dibujo.',
  fileName: v => `neon_${v.source === 'text' ? firstLine(v.text) : v.source}`,
  params: [
    { type: 'group', label: 'Diseño' },
    { key: 'source', type: 'segment', label: 'El neón sigue', default: 'text', options: [{ value: 'text', label: 'Un texto' }, { value: 'shape', label: 'Una forma' }, { value: 'image', label: 'Un dibujo de línea' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'Hola', show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => v.source === 'text', hint: 'Las cursivas unidas (Pacifico, Lobster) dan un solo recorrido.' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: ['heart', 'star', 'circle', 'paw'].map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    ...imageParams({ label: 'Dibujo de línea (fondo blanco)', showIf: v => v.source === 'image' }),
    { key: 'width', type: 'number', label: 'Ancho del cartel', default: 220, min: 80, max: 260, step: 1, unit: 'mm' },

    { type: 'group', label: 'Canal' },
    { key: 'neonW', type: 'number', label: 'Ancho del neón', default: 6, min: 4, max: 16, step: 0.5, unit: 'mm', hint: 'Medí la manguera: las comunes son de 6 × 12 o 8 × 16 mm.' },
    { key: 'channelH', type: 'number', label: 'Alto del canal', default: 8, min: 3, max: 20, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared del canal', default: 1.6, min: 1, max: 4, step: 0.2, unit: 'mm' },
    { key: 'grip', type: 'number', label: 'Ajuste (más chico = más apretado)', default: -0.2, min: -1, max: 1, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Placa' },
    { key: 'backing', type: 'segment', label: 'Fondo', default: 'contour', options: [{ value: 'contour', label: 'Siguiendo el diseño' }, { value: 'rect', label: 'Rectángulo' }] },
    { key: 'margin', type: 'number', label: 'Margen', default: 8, min: 3, max: 30, step: 0.5, unit: 'mm' },
    { key: 'plateT', type: 'number', label: 'Espesor de la placa', default: 3, min: 2, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hang', type: 'toggle', label: 'Agujeros para colgar', default: true },
    { key: 'cPlate', type: 'color', label: 'Placa', default: '#1E1E1E' },
    { key: 'cChannel', type: 'color', label: 'Canal', default: '#1E1E1E' },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    // Recorrido del neón: la línea central del canal
    let path;
    if (v.source === 'image') {
      let lines = await silhouette(v, ctx, v.width, { fill: false });
      if (!v.image) lines = lines.subtract(lines.offset(-1, 'Round', 2, 16));
      path = lines; // líneas finas: el canal va centrado sobre ellas
    } else {
      let figure;
      if (v.source === 'text') {
        const font = await ctx.font(v.font);
        figure = fillHoles(stackLines([{ font, text: v.text || ' ', height: 20 }], 0).offset(1.5, 'Round', 2, 16));
      } else figure = SHAPES[v.shape].make(100, 90);
      const fb = figure.bounds();
      figure = figure.scale((v.width - 2 * v.margin - v.neonW) / (fb.max[0] - fb.min[0]));
      // Contorno de la figura (anillo fino): ese es el camino del neón
      path = figure.subtract(figure.offset(-0.6, 'Round', 2, 24));
    }
    const half = (v.neonW + v.grip) / 2;
    const slot = path.offset(half, 'Round', 2, 24);
    const walls = path.offset(half + v.wall, 'Round', 2, 24).subtract(slot);
    const pb = slot.bounds();
    const back = v.backing === 'rect'
      ? roundedRect(pb.max[0] - pb.min[0] + 2 * v.margin, pb.max[1] - pb.min[1] + 2 * v.margin, 8).translate([(pb.min[0] + pb.max[0]) / 2, (pb.min[1] + pb.max[1]) / 2])
      : fillHoles(outline(slot, v.margin));
    let plate = slab(back, v.plateT);
    if (v.hang) {
      const y = pb.max[1] + v.margin * 0.4;
      const xs = [pb.min[0] + (pb.max[0] - pb.min[0]) * 0.25, pb.min[0] + (pb.max[0] - pb.min[0]) * 0.75];
      for (const x of xs) {
        const hole = circle(2, 24).translate([x, Math.min(y, pb.max[1] + v.margin - 3)]);
        if (hole.subtract(back.offset(-1, 'Round', 2, 16)).isEmpty()) plate = plate.subtract(slab(hole, v.plateT + 2, -1));
      }
    }
    // Salida de cable: un agujero en el comienzo del canal (abajo a la izquierda)
    const start = slot.intersect(CrossSection.square([v.neonW * 3, v.neonW * 3], true).translate([pb.min[0] + v.neonW, (pb.min[1] + pb.max[1]) / 2])).bounds();
    if (start.max[0] > start.min[0]) plate = plate.subtract(slab(circle(Math.min(3.5, half), 24).translate([(start.min[0] + start.max[0]) / 2, (start.min[1] + start.max[1]) / 2]), v.plateT + 2, -1));
    return mergeByColor([
      part('Placa', v.cPlate, plate),
      part('Canal', v.cChannel, slab(walls, v.channelH, v.plateT)),
    ]);
  },
};
