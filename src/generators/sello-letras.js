/**
 * Sellos de letras y números: uno por carácter, con mango, para escribir en
 * masas, fondant, arcilla o porcelana fría. Las letras van espejadas.
 * Cada sello se imprime con el mango sobre la cama (transición a 45°, sin soportes).
 */
import { wasm, circle, roundedRect, slab, part, textShape } from '../engine/geom.js';
import { fitInto } from '../engine/shapes.js';

export default {
  id: 'sello-letras',
  title: 'Sellos de letras y números',
  description: 'Un sello por letra o número, con mango, para escribir en masas.',
  fileName: v => `sellos_${(v.chars || 'abc').replace(/\s+/g, '').slice(0, 12)}`,
  params: [
    { type: 'group', label: 'Letras' },
    { key: 'chars', type: 'text', label: 'Letras y números a imprimir', default: 'FELIZ', hint: 'Uno por sello. Los repetidos se imprimen una sola vez.' },
    { key: 'dedupe', type: 'toggle', label: 'Saltear repetidos', default: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'fredoka' },

    { type: 'group', label: 'Sello' },
    { key: 'size', type: 'number', label: 'Lado del sello', default: 22, min: 10, max: 50, step: 1, unit: 'mm' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'square', options: [{ value: 'square', label: 'Cuadrado' }, { value: 'circle', label: 'Redondo' }] },
    { key: 'fill', type: 'number', label: 'Tamaño de la letra', default: 0.78, min: 0.5, max: 0.95, step: 0.01, unit: '×' },
    { key: 'relief', type: 'number', label: 'Relieve de la letra', default: 2, min: 0.6, max: 5, step: 0.1, unit: 'mm' },
    { key: 'handleH', type: 'number', label: 'Alto del mango', default: 14, min: 6, max: 40, step: 1, unit: 'mm' },
    { key: 'mirror', type: 'toggle', label: 'Espejar (para que se lea al derecho)', default: true },
    { key: 'color', type: 'color', label: 'Color', default: '#C2410C' },
  ],

  async build(v, ctx) {
    const { Manifold } = wasm();
    const font = await ctx.font(v.font);
    let chars = Array.from(String(v.chars || 'A').replace(/\s+/g, '')).slice(0, 40);
    if (v.dedupe) chars = chars.filter((c, i) => chars.indexOf(c) === i);
    if (!chars.length) chars = ['A'];
    const S = v.size, gap = 4;
    const face = v.shape === 'circle' ? circle(S / 2, 96) : roundedRect(S, S, S * 0.12);
    const rH = S * 0.32, R = v.shape === 'circle' ? S / 2 : S / 2 * Math.SQRT2, reach = R - rH, discH = 2.4;
    const z0 = v.handleH + reach;
    const cols = Math.ceil(Math.sqrt(chars.length));
    const stamps = chars.map((ch, i) => {
      let glyph = textShape(font, ch, { height: 10 });
      glyph = fitInto(glyph, S * v.fill, S * v.fill);
      if (v.mirror) glyph = glyph.mirror([1, 0]);
      let body = Manifold.cylinder(v.handleH, rH, rH, 48)
        .add(Manifold.cylinder(reach, rH, R, 64).translate([0, 0, v.handleH]))
        .intersect(slab(face.add(circle(rH, 48)), z0 + 1, -0.5))
        .add(slab(face, discH, z0))
        .add(slab(glyph.intersect(face.offset(-0.6, 'Round', 2, 24)), v.relief, z0 + discH));
      const x = (i % cols) * (S + gap), y = -Math.floor(i / cols) * (S + gap);
      return body.translate([x, y, 0]);
    });
    const all = Manifold.union(stamps);
    const b = all.boundingBox();
    return [part(`Sellos (${chars.length})`, v.color, all.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, 0]))];
  },
};
