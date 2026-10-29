/**
 * Cortador en cuadrícula: corta varios rectángulos (o cuadrados) iguales de una vez,
 * para galletitas, alfajores, ravioles o porcelana fría. Filo arriba y
 * faldón con manija abajo; se imprime sin soportes.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

export default {
  id: 'cortador-rectangulos',
  title: 'Cortador en cuadrícula',
  description: 'Corta varios rectángulos iguales de una sola vez.',
  fileName: v => `cortador_${v.cols}x${v.rows}_${v.cw}x${v.ch}`,
  params: [
    { type: 'group', label: 'Piezas' },
    { key: 'cw', type: 'number', label: 'Ancho de cada pieza', default: 40, min: 10, max: 120, step: 1, unit: 'mm' },
    { key: 'ch', type: 'number', label: 'Alto de cada pieza', default: 25, min: 10, max: 120, step: 1, unit: 'mm' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 4, min: 1, max: 10, step: 1, unit: '' },
    { key: 'rows', type: 'number', label: 'Filas', default: 3, min: 1, max: 10, step: 1, unit: '' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 2, min: 0, max: 20, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Cortador' },
    { key: 'height', type: 'number', label: 'Alto', default: 15, min: 6, max: 40, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.2, min: 0.6, max: 3, step: 0.1, unit: 'mm' },
    { key: 'blade', type: 'number', label: 'Filo', default: 0.5, min: 0.4, max: 1.5, step: 0.05, unit: 'mm' },
    { key: 'handle', type: 'toggle', label: 'Manijas a los costados', default: true },
    { key: 'color', type: 'color', label: 'Color', default: '#F77F00' },
  ],
  build(v) {
    const { CrossSection } = wasm();
    const cells = [];
    for (let i = 0; i < v.cols; i++) for (let j = 0; j < v.rows; j++) {
      cells.push(roundedRect(v.cw, v.ch, Math.min(v.radius, v.cw / 2 - 0.5, v.ch / 2 - 0.5)).translate([(i - (v.cols - 1) / 2) * v.cw, (j - (v.rows - 1) / 2) * v.ch]));
    }
    const W = v.cols * v.cw, H = v.rows * v.ch;
    const box = CrossSection.square([W, H], true);
    const walls = t => box.offset(t / 2, 'Miter', 2, 4).subtract(CrossSection.union(cells.map(c => c.offset(-t / 2, 'Round', 2, 24))));
    const bladeH = 3, lower = v.height - bladeH;
    let body = slab(walls(v.wall), lower).add(slab(walls(v.blade), bladeH, lower));
    // Faldón: refuerzo ancho abajo (la parte que se aprieta con la mano)
    const flange = box.offset(5, 'Round', 2, 24).subtract(box.offset(-v.wall / 2, 'Miter', 2, 4));
    body = body.add(slab(flange, 1.8));
    if (v.handle) {
      for (const s of [-1, 1]) body = body.add(slab(roundedRect(14, Math.min(40, H * 0.6), 4).translate([s * (W / 2 + 10), 0]), 1.8 + 3));
    }
    return mergeByColor([part('Cortador', v.color, body)]);
  },
};
