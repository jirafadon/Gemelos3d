/**
 * Rosa con nombre: el nombre en letra cursiva hace de tallo, con una rosa al final
 * (pétalos en espiral en relieve) y una hojita. Dos colores; plana, para regalar o colgar.
 */
import { wasm, circle, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { firstLine } from './_common.js';

/** Rosa 2D: contorno y líneas de pétalos en espiral. */
function rose(d) {
  const { CrossSection } = wasm();
  const R = d / 2, petals = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = R * (0.25 + 0.075 * i);
    petals.push(circle(r * 0.62, 48).scale([1.25, 0.9]).rotate(a * 57.3).translate([Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42]));
  }
  const head = CrossSection.union(petals).offset(0.4, 'Round', 2, 16);
  // Líneas entre pétalos: el borde de cada pétalo, adentro de la cabeza
  const lines = CrossSection.union(petals.map(p => p.subtract(p.offset(-0.9, 'Round', 2, 12)))).intersect(head.offset(-1.2, 'Round', 2, 16));
  return { head, lines };
}

export default {
  id: 'rosa-nombre',
  title: 'Rosa con nombre',
  description: 'El nombre en cursiva hace de tallo, con una rosa en relieve al final y una hojita.',
  fileName: v => `rosa_${firstLine(v.text)}`,
  params: [
    { key: 'text', type: 'text', label: 'Nombre', default: 'Martina' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'great-vibes', hint: 'Las cursivas unidas quedan como un tallo.' },
    { key: 'width', type: 'number', label: 'Largo total', default: 130, min: 60, max: 260, step: 1, unit: 'mm' },
    { key: 'roseSize', type: 'number', label: 'Tamaño de la rosa', default: 34, min: 15, max: 80, step: 1, unit: 'mm' },
    { key: 'border', type: 'number', label: 'Contorno', default: 2.2, min: 1, max: 5, step: 0.1, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 6, step: 0.2, unit: 'mm' },
    { key: 'hole', type: 'toggle', label: 'Agujero para colgar', default: false },
    { key: 'cStem', type: 'color', label: 'Tallo y nombre', default: '#2D6A4F' },
    { key: 'cRose', type: 'color', label: 'Rosa', default: '#D62828' },
    { key: 'cLines', type: 'color', label: 'Líneas de los pétalos', default: '#7F1D1D' },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    const font = await ctx.font(v.font);
    let name = stackLines([{ font, text: v.text || ' ', height: 20 }]);
    const nb = name.bounds();
    const k = (v.width - v.roseSize * 0.8) / Math.max(1, nb.max[0] - nb.min[0]);
    name = name.translate([-nb.min[0], -(nb.min[1] + nb.max[1]) / 2]).scale([k, k]);
    const b = name.bounds();
    const { head, lines } = rose(v.roseSize);
    const at = [b.max[0] + v.roseSize * 0.3, b.max[1] * 0.4];
    const headP = head.translate(at), linesP = lines.translate(at);
    // Hojita entre el nombre y la rosa
    const leaf = circle(v.roseSize * 0.22, 40).scale([1.8, 0.8]).rotate(-30).translate([at[0] - v.roseSize * 0.45, at[1] - v.roseSize * 0.42]);
    const leafVein = CrossSection.square([v.roseSize * 0.55, 0.8], true).rotate(-30).translate([at[0] - v.roseSize * 0.45, at[1] - v.roseSize * 0.42]);
    let base = fillHoles(outline(name.add(leaf), v.border)).add(outline(headP, v.border));
    // Puente del nombre a la rosa (por si no se tocan)
    base = base.add(wasm().CrossSection.hull([circle(2, 16).translate([b.max[0] - 2, 0]), circle(2, 16).translate([at[0] - v.roseSize * 0.3, at[1] - v.roseSize * 0.25])]));
    if (v.hole) { const hp = [at[0] + v.roseSize * 0.5, at[1] + v.roseSize * 0.35]; base = base.add(circle(4.2, 32).translate(hp)).subtract(circle(2, 24).translate(hp)); }
    const t = v.thick;
    return mergeByColor([
      part('Tallo y nombre', v.cStem, slab(base, t).add(slab(name.add(leaf.subtract(leafVein)).subtract(headP), 1, t))),
      part('Rosa', v.cRose, slab(headP.subtract(linesP), 1.6, t)),
      part('Líneas', v.cLines, slab(linesP, 1.2, t)),
    ]);
  },
};
