/**
 * Cubos apilables: un cubo por letra con la letra en relieve al frente (en otro color)
 * y encastre arriba/abajo para apilarlos o unirlos. Se imprimen con el hueco abajo.
 */
import { wasm, roundedRect, slab, part, textShape } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

const PALETTE = ['#E63946', '#F4A261', '#2A9D8F', '#457B9D', '#8AC926', '#FFCA3A', '#6A4C93', '#F72585'];

export default {
  id: 'cubos-apilables',
  title: 'Cubos apilables con letras',
  description: 'Un cubo por letra, con la letra en relieve y encastre para apilarlos.',
  fileName: v => `cubos_${(v.text || 'ABC').replace(/\s+/g, '').slice(0, 12)}`,
  params: [
    { type: 'group', label: 'Letras' },
    { key: 'text', type: 'text', label: 'Nombre o palabra', default: 'TOMI' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },
    { key: 'sides', type: 'segment', label: 'Caras con letra', default: 1, options: [{ value: 1, label: 'Solo al frente' }, { value: 2, label: 'Frente y atrás' }] },

    { type: 'group', label: 'Cubo' },
    { key: 'size', type: 'number', label: 'Lado del cubo', default: 30, min: 15, max: 70, step: 1, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de aristas', default: 3, min: 0, max: 10, step: 0.5, unit: 'mm' },
    { key: 'relief', type: 'number', label: 'Relieve de la letra', default: 1.2, min: 0.4, max: 4, step: 0.2, unit: 'mm' },
    { key: 'joint', type: 'segment', label: 'Encastre', default: 'stack', options: [{ value: 'stack', label: 'Para apilar' }, { value: 'none', label: 'Sin encastre' }] },
    { key: 'tol', type: 'number', label: 'Holgura del encastre', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', show: v => v.joint === 'stack' },

    { type: 'group', label: 'Colores' },
    { key: 'rainbow', type: 'toggle', label: 'Cada cubo de un color', default: true },
    { key: 'cCube', type: 'color', label: 'Cubos', default: '#F5F5F5', show: v => !v.rainbow },
    { key: 'cLetter', type: 'color', label: 'Letras', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const font = await ctx.font(v.font);
    const chars = Array.from(String(v.text || 'A').replace(/\s+/g, '')).slice(0, 16);
    if (!chars.length) chars.push('A');
    const S = v.size, r = Math.min(v.radius, S / 2 - 1), gap = 6;
    const parts = [];
    chars.forEach((ch, i) => {
      // Cubo con aristas redondeadas (casco de esferas) o caja recta
      let cube;
      if (r > 0.2) {
        const s = [];
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [0, 1]) s.push(Manifold.sphere(r, 24).translate([x * (S / 2 - r), y * (S / 2 - r), z ? S - r : r]));
        // abajo plano para que se apoye bien en la cama
        cube = Manifold.hull(s).add(slab(roundedRect(S, S, r), r));
      } else cube = Manifold.cube([S, S, S], true).translate([0, 0, S / 2]);
      // Encastre: perno arriba y hueco abajo (el de abajo es un puente corto, imprimible)
      if (v.joint === 'stack') {
        const pr = S * 0.16, ph = S * 0.12;
        cube = cube.add(Manifold.cylinder(ph, pr, pr * 0.9, 48).translate([0, 0, S - 0.01]))
          .subtract(Manifold.cylinder(ph + 0.4, pr + v.tol, pr * 0.9 + v.tol, 48).translate([0, 0, -0.01]));
      }
      const glyph = fitInto(textShape(font, ch, { height: 10 }), S * 0.68, S * 0.68);
      // Letra en la cara del frente (-Y), parada; opcional también atrás
      const front = glyph.extrude(v.relief + 0.5).translate([0, 0, -0.5]).rotate([90, 0, 0]).translate([0, -S / 2, S / 2]);
      let letter = front.subtract(Manifold.cube([S + 2, S, S + 2], true).translate([0, 0, S / 2]));
      if (v.sides === 2) {
        const back = front.rotate([0, 0, 180]); // misma letra, legible desde atrás
        letter = letter.add(back.subtract(Manifold.cube([S + 2, S, S + 2], true).translate([0, 0, S / 2])));
      }
      const x = i * (S + gap);
      const color = v.rainbow ? PALETTE[i % PALETTE.length] : v.cCube;
      parts.push(part(`Cubo ${ch}`, color, cube.translate([x, 0, 0])));
      parts.push(part('Letras', v.cLetter, letter.translate([x, 0, 0])));
    });
    return mergeByColor(parts);
  },
};
