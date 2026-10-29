/**
 * Gridfinity: cajitas (bins) y bases sobre la grilla estándar de 42 mm.
 * Medidas del estándar: celda 42 mm, unidad de alto 7 mm, pie de 4,75 mm
 * con perfil 0,8 (45°) + 1,8 (recto) + 2,15 (45°).
 */
import { wasm, roundedRect, circle, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

const P = 42, U = 7, FOOT = 4.75;

/** Pie de una celda: casco de tres escalones (sale 41,5 arriba). */
function foot(grow = 0, extraDown = 0) {
  const { Manifold } = wasm();
  const layer = (s, r, z) => slab(roundedRect(s + 2 * grow, s + 2 * grow, r + grow), 0.01, z);
  const pieces = [layer(35.6, 0.8, -extraDown), layer(35.6, 0.8, 0), layer(37.2, 1.6, 0.8), layer(37.2, 1.6, 2.6), layer(41.5, 3.75, FOOT - 0.01)];
  return Manifold.hull(pieces);
}

export default {
  id: 'gridfinity',
  title: 'Gridfinity',
  description: 'Cajitas y bases compatibles con Gridfinity (grilla de 42 mm).',
  fileName: v => v.kind === 'base' ? `gridfinity_base_${v.gx}x${v.gy}` : `gridfinity_bin_${v.gx}x${v.gy}x${v.gz}`,
  params: [
    { type: 'group', label: 'Qué hacer' },
    { key: 'kind', type: 'segment', label: 'Pieza', default: 'bin', options: [{ value: 'bin', label: 'Cajita (bin)' }, { value: 'base', label: 'Base (grilla)' }] },
    { key: 'gx', type: 'number', label: 'Celdas a lo ancho', default: 2, min: 1, max: 6, step: 1, unit: '× 42' },
    { key: 'gy', type: 'number', label: 'Celdas a lo profundo', default: 1, min: 1, max: 6, step: 1, unit: '× 42' },
    { key: 'gz', type: 'number', label: 'Alto en unidades', default: 3, min: 2, max: 15, step: 1, unit: '× 7 mm', show: v => v.kind === 'bin' },

    { type: 'group', label: 'Cajita', show: v => v.kind === 'bin' },
    { key: 'div', type: 'number', label: 'Compartimentos', default: 2, min: 1, max: 8, step: 1, unit: '', show: v => v.kind === 'bin' },
    { key: 'lipOn', type: 'toggle', label: 'Labio para apilar', default: true, show: v => v.kind === 'bin' },
    { key: 'magnets', type: 'toggle', label: 'Huecos para imanes (6 × 2 mm)', default: false, show: v => v.kind === 'bin' },
    { key: 'label', type: 'text', label: 'Etiqueta en relieve (opcional)', default: 'Tornillos M3', show: v => v.kind === 'bin' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => v.kind === 'bin' && !!(v.label || '').trim() },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Color', default: '#334155' },
    { key: 'cLabel', type: 'color', label: 'Etiqueta', default: '#F5F5F5', show: v => v.kind === 'bin' && !!(v.label || '').trim() },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const nx = v.gx, ny = v.gy;
    const cells = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) cells.push([(i - (nx - 1) / 2) * P, (j - (ny - 1) / 2) * P]);

    if (v.kind === 'base') {
      // Base abierta: placa con el negativo del pie en cada celda
      const H = FOOT + 0.25;
      const plate = slab(roundedRect(nx * P, ny * P, 4), H);
      const pocket = foot(0.25, 1).translate([0, 0, H - FOOT + 0.01]);
      const cut = Manifold.union(cells.map(c => pocket.translate([c[0], c[1], 0])));
      return [part('Base Gridfinity', v.color, plate.subtract(cut))];
    }

    const W = nx * P - 0.5, D = ny * P - 0.5, H = v.gz * U;
    const outer = roundedRect(W, D, 3.75);
    const feet = Manifold.union(cells.map(c => foot().translate([c[0], c[1], 0])));
    let body = feet.add(slab(outer, H - FOOT, FOOT));
    const wall = 1.2, floor = FOOT + 1.2;
    const inner = roundedRect(W - 2 * wall, D - 2 * wall, 3.75 - wall);
    body = body.subtract(slab(inner, H, floor));

    // Labio superior: el pie de otra cajita encaja encima
    if (v.lipOn) {
      const lipH = 4.4;
      const ring = slab(outer, lipH, H - 0.01);
      const funnel = Manifold.hull([slab(inner, 0.01, H - 0.01), slab(outer.offset(-0.6, 'Round', 2, 32), 0.01, H + lipH - 1.8), slab(outer.offset(-0.6, 'Round', 2, 32), 0.01, H + lipH + 0.5)]);
      body = body.add(ring.subtract(funnel));
    }

    // Divisiones a lo ancho
    const iw = W - 2 * wall;
    const divs = [];
    for (let k = 1; k < v.div; k++) divs.push(CrossSection.square([1.2, D - 2 * wall + 0.2], true).translate([-iw / 2 + iw * k / v.div, 0]));
    if (divs.length) body = body.add(slab(CrossSection.union(divs).intersect(inner.offset(0.1)), H - floor - 0.6, floor));

    if (v.magnets) {
      const holes = [];
      for (const [cx, cy] of cells) for (const sx of [-1, 1]) for (const sy of [-1, 1]) holes.push(slab(circle(3.25, 32), 2.4, -0.01).translate([cx + sx * 13, cy + sy * 13, 0]));
      body = body.subtract(Manifold.union(holes));
    }

    const parts = [part('Cajita', v.color, body)];
    if ((v.label || '').trim()) {
      // Pestaña de etiqueta en la pared de atrás, con el texto en relieve
      const font = await ctx.font(v.font);
      const tabD = 12;
      const tab = slab(CrossSection.square([iw, tabD], true), 1.2, H - 1.2).translate([0, D / 2 - wall - tabD / 2, 0]);
      const brace = Manifold.hull([slab(CrossSection.square([iw, tabD], true), 0.01, H - 1.2), slab(CrossSection.square([iw, 0.5], true).translate([0, tabD / 2 - 0.25]), 0.01, H - 1.2 - tabD)]).translate([0, D / 2 - wall - tabD / 2, 0]);
      parts[0].solid = parts[0].solid.add(tab).add(brace.intersect(slab(inner, H, 0)));
      const txt = fitInto(stackLines([{ font, text: v.label, height: 10 }], 0), iw * 0.9, tabD * 0.6).translate([0, D / 2 - wall - tabD / 2]);
      parts.push(part('Etiqueta', v.cLabel, slab(txt, 0.6, H)));
    }
    return mergeByColor(parts);
  },
};
