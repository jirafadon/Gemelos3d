/**
 * Aros (el par): tu dibujo, una forma o una inicial, espejados uno del otro,
 * con agujero para el gancho y opcional un segundo color embutido.
 */
import { wasm, circle, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { imageParams, silhouette } from './_common.js';

const FORMS = ['heart', 'star', 'drop', 'moon', 'flower', 'cloudShape', 'circle'].filter(k => SHAPES[k]);

export default {
  id: 'aros',
  title: 'Aros',
  description: 'El par de aros desde tu dibujo, una forma o una inicial: espejados, livianos y con agujero para el gancho.',
  fileName: v => `aros_${v.source}`,
  params: [
    { type: 'group', label: 'Diseño' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'shape', options: [{ value: 'shape', label: 'Forma' }, { value: 'image', label: 'Dibujo' }, { value: 'text', label: 'Inicial' }] },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: FORMS.map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    ...imageParams({ showIf: v => v.source === 'image' }).filter(p => ['image', 'removeBg', 'bgTol', 'threshold', 'invert', 'smooth', 'specks'].includes(p.key)),
    { key: 'text', type: 'text', label: 'Inicial o palabra', default: 'A', show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => v.source === 'text' },
    { key: 'cutout', type: 'toggle', label: 'Calado por dentro (más liviano)', default: false, show: v => v.source === 'shape' },
    { key: 'size', type: 'number', label: 'Alto', default: 32, min: 12, max: 70, step: 1, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 2, min: 1.2, max: 4, step: 0.1, unit: 'mm' },
    { key: 'holeD', type: 'number', label: 'Agujero', default: 1.6, min: 0.8, max: 3, step: 0.1, unit: 'mm' },
    { key: 'mirror', type: 'toggle', label: 'Espejados (izquierdo y derecho)', default: true },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Color', default: '#E63946' },
    { key: 'two', type: 'toggle', label: 'Borde de otro color', default: false },
    { key: 'color2', type: 'color', label: 'Borde', default: '#C9A227', show: v => v.two },
  ],
  async build(v, ctx) {
    let shape;
    if (v.source === 'image') shape = fillHoles(await silhouette(v, ctx, 100, { fill: false }));
    else if (v.source === 'text') { const font = await ctx.font(v.font); shape = outline(stackLines([{ font, text: v.text || 'A', height: 20 }]), 0.6); }
    else { shape = SHAPES[v.shape].make(100, 100); if (v.cutout) shape = shape.subtract(shape.offset(-12, 'Round', 2, 24)); }
    shape = fitInto(shape, v.size, v.size);
    // Agujero arriba al centro, con un aro de refuerzo
    const top = shape.intersect(wasm().CrossSection.square([3, v.size * 3], true));
    const ty = (top.isEmpty() ? shape : top).bounds().max[1];
    const hr = v.holeD / 2, at = [0, ty + hr * 0.4];
    shape = shape.add(circle(hr + 1.4, 32).translate(at)).subtract(circle(hr, 24).translate(at));
    const parts = [];
    const b = shape.bounds(), gap = (b.max[0] - b.min[0]) + 6;
    for (const [i, s] of [shape, v.mirror ? shape.mirror([1, 0]) : shape].entries()) {
      const placed = s.translate([i === 0 ? -gap / 2 : gap / 2, 0]);
      if (v.two) {
        const rim = placed.subtract(placed.offset(-1.2, 'Round', 2, 16));
        parts.push(part('Aro', v.color, slab(placed.subtract(rim), v.thick)), part('Borde', v.color2, slab(rim, v.thick)));
      } else parts.push(part('Aro', v.color, slab(placed, v.thick)));
    }
    return mergeByColor(parts);
  },
};
