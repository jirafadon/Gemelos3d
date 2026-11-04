/**
 * Texto de pared con guía: letras grandes sueltas (con huecos atrás para cinta doble faz o clavos)
 * y una plantilla finita con el contorno de cada letra en su lugar, para pegarlas derechas y bien espaciadas.
 */
import { wasm, circle, roundedRect, outline, slab, part, textShape } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { firstLine } from './_common.js';

export default {
  id: 'texto-guia',
  title: 'Texto de pared con guía',
  description: 'Letras grandes para pegar en la pared, cada una suelta, más una plantilla para ubicarlas derechas.',
  fileName: v => `pared_${firstLine(v.text)}`,
  params: [
    { key: 'text', type: 'text', label: 'Texto', default: 'HOME' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'bebas' },
    { key: 'height', type: 'number', label: 'Alto de las letras', default: 120, min: 30, max: 250, step: 1, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 6, min: 2, max: 20, step: 0.5, unit: 'mm' },
    { key: 'mount', type: 'segment', label: 'Atrás', default: 'tape', options: [{ value: 'tape', label: 'Para cinta doble faz' }, { value: 'nail', label: 'Para clavito' }, { value: 'flat', label: 'Liso' }] },
    { key: 'guide', type: 'toggle', label: 'Plantilla de ubicación', default: true, hint: 'Una tira finita con el contorno de cada letra. Se pega con cinta en la pared, ponés las letras y la sacás.' },
    { key: 'color', type: 'color', label: 'Letras', default: '#1E1E1E' },
    { key: 'cGuide', type: 'color', label: 'Plantilla', default: '#F4A261', show: v => v.guide },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const font = await ctx.font(v.font);
    const all = textShape(font, (v.text || ' ').replace(/\n/g, ' '), { height: v.height });
    // Cada letra por separado (las islas), de izquierda a derecha, sin contar los huecos
    const letters = all.decompose().sort((a, b) => a.bounds().min[0] - b.bounds().min[0]);
    const parts = [];
    const ab = all.bounds();
    letters.forEach((L, i) => {
      let s = slab(L, v.thick);
      const b = L.bounds(), cx = (b.min[0] + b.max[0]) / 2;
      if (v.mount === 'tape') s = s.subtract(slab(L.offset(-3, 'Round', 2, 16), 1, -0.01));
      if (v.mount === 'nail') {
        // Ojal en forma de bocallave arriba (por atrás), donde la letra es más gruesa
        const at = [cx, b.max[1] - Math.min(14, (b.max[1] - b.min[1]) * 0.15)];
        const key = circle(4, 32).translate(at).add(roundedRect(3.6, 7, 1.8).translate([at[0], at[1] - 3.5]));
        if (key.subtract(L.offset(-1.5, 'Round', 2, 12)).isEmpty()) s = s.subtract(slab(key, Math.min(4, v.thick - 1.5), -0.01));
      }
      // Las letras se muestran separadas un poco para imprimir
      parts.push(part('Letras', v.color, s.translate([i * 8, 0, 0])));
    });
    if (v.guide) {
      // Plantilla: contorno de cada letra en su lugar, unidos por una tira abajo
      const rings = letters.map(L => outline(L, 1.6).subtract(L.offset(0.4, 'Round', 2, 16)));
      const bar = roundedRect(ab.max[0] - ab.min[0] + 20, 12, 3).translate([(ab.min[0] + ab.max[0]) / 2, ab.min[1] - 6]);
      const ticks = letters.map(L => { const b = L.bounds(); return CrossSection.square([1.6, 8], false).translate([(b.min[0] + b.max[0]) / 2 - 0.8, b.min[1] - 8]); });
      const guide = CrossSection.union([...rings, bar, ...ticks]);
      parts.push(part('Plantilla', v.cGuide, slab(guide, 1).translate([0, -(ab.max[1] - ab.min[1]) - 30, 0])));
    }
    return mergeByColor(parts);
  },
};
