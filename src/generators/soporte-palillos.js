/** Soporte para palillos o pinchos decorativos: una base con la forma que quieras y agujeros para clavarlos. */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'soporte-palillos',
  title: 'Soporte para palillos',
  description: 'Pie para pinchos, palillos o brochetas decorativas: forma de corazón, estrella, nube o redondo, con agujeros y nombre.',
  fileName: v => `soporte_palillos_${v.shape}`,
  params: [
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: ['heart', 'star', 'circle', 'cloudShape', 'flower', 'hexagon'].filter(k => SHAPES[k]).map(k => ({ value: k, label: SHAPES[k].label })) },
    { key: 'size', type: 'number', label: 'Tamaño', default: 110, min: 40, max: 250, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 22, min: 8, max: 60, step: 1, unit: 'mm' },
    { key: 'holeD', type: 'number', label: 'Diámetro de los palillos', default: 3.4, min: 1.5, max: 10, step: 0.1, unit: 'mm' },
    { key: 'pitch', type: 'number', label: 'Separación', default: 12, min: 5, max: 40, step: 0.5, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Hondo de los agujeros', default: 18, min: 4, max: 58, step: 1, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Texto (opcional)', default: '' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Color', default: '#F4A261' },
    { key: 'color2', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const shape = SHAPES[v.shape].make(v.size, v.size * 0.9);
    let body = slab(shape, v.height);
    const inner = shape.offset(-Math.max(5, v.holeD * 1.5), 'Round', 2, 24);
    const b = inner.bounds(), holes = [];
    for (let y = b.min[1], j = 0; y <= b.max[1]; y += v.pitch * 0.866, j++) for (let x = b.min[0] + (j % 2 ? v.pitch / 2 : 0); x <= b.max[0]; x += v.pitch) {
      if (!inner.intersect(circle(0.1, 8).translate([x, y])).isEmpty()) holes.push(Manifold.cylinder(v.depth + 1, v.holeD / 2 + 0.15, v.holeD / 2 + 0.15, 20).translate([x, y, v.height - Math.min(v.depth, v.height - 2)]));
    }
    const parts = [];
    let txtArea = null;
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      // El texto va arriba, en una franja sin agujeros
      const t = fitInto(stackLines([{ font, text: v.text, height: 10 }]), (b.max[0] - b.min[0]) * 0.7, v.size * 0.12).translate([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2 - (b.max[1] - b.min[1]) * 0.12]).intersect(inner);
      txtArea = t.offset(3, 'Round', 2, 16);
      const inl = slab(t, 0.8, v.height - 0.8);
      body = body.subtract(inl);
      parts.push(part('Texto', v.color2, inl));
    }
    const hs = txtArea ? holes.filter(h => { const bb = h.boundingBox(); return txtArea.intersect(circle(v.holeD, 12).translate([(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2])).isEmpty(); }) : holes;
    if (hs.length) body = body.subtract(Manifold.union(hs));
    parts.unshift(part('Soporte', v.color, body));
    return mergeByColor(parts);
  },
};
