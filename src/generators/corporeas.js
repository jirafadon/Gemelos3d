/**
 * Letras corpóreas: cada letra como pieza aparte, maciza o hueca (para luz LED),
 * con agujeros atrás para colgarla. Si una letra no entra en la cama, se corta sola
 * en partes con agujeros para pernos (varilla de 4 mm o filamento) que las vuelven a unir.
 */
import { wasm, textShape, slab, part } from '../engine/geom.js';

/** ¿El punto (x, y) cae adentro de la forma? */
const inside = (cs, x, y, r = 0.5) => !cs.intersect(wasm().CrossSection.square([r * 2, r * 2], true).translate([x, y])).isEmpty();

export default {
  id: 'corporeas',
  title: 'Letras corpóreas',
  description: 'Letras gruesas por separado, macizas o huecas para LED; las grandes se cortan solas con pernos.',
  fileName: v => `corporeas_${(v.text || 'ABC').replace(/\s+/g, '').slice(0, 16)}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Texto', default: 'HOLA' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'anton', hint: 'Las gruesas (Anton, Bebas, Bangers) se ven mejor y son más firmes.' },
    { key: 'height', type: 'number', label: 'Alto de las letras', default: 150, min: 30, max: 1000, step: 5, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 20, min: 4, max: 80, step: 1, unit: 'mm' },

    { type: 'group', label: 'Estilo' },
    { key: 'style', type: 'segment', label: 'Tipo', default: 'solid', options: [{ value: 'solid', label: 'Maciza' }, { value: 'hollow', label: 'Hueca (para LED)' }] },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 1.2, max: 6, step: 0.2, unit: 'mm', show: v => v.style === 'hollow' },
    { key: 'front', type: 'number', label: 'Frente', default: 1.2, min: 0.6, max: 4, step: 0.2, unit: 'mm', show: v => v.style === 'hollow', hint: 'Fino deja pasar la luz si imprimís en blanco o natural.' },
    { key: 'hang', type: 'toggle', label: 'Agujeros atrás para colgar', default: true, show: v => v.style === 'solid' },

    { type: 'group', label: 'Cama de la impresora' },
    { key: 'bedX', type: 'number', label: 'Ancho útil de la cama', default: 250, min: 100, max: 500, step: 5, unit: 'mm', hint: 'La U1 tiene 270 mm: dejá un margen.' },
    { key: 'bedY', type: 'number', label: 'Fondo útil de la cama', default: 250, min: 100, max: 500, step: 5, unit: 'mm' },
    { key: 'pinD', type: 'number', label: 'Diámetro de los pernos', default: 4, min: 1.75, max: 8, step: 0.25, unit: 'mm', hint: 'El agujero sale 0,3 mm más grande.' },
    { key: 'color', type: 'color', label: 'Color', default: '#D62828' },
  ],

  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    const font = await ctx.font(v.font);
    const chars = Array.from(String(v.text || 'A').replace(/\s+/g, '')).slice(0, 30);
    if (!chars.length) chars.push('A');
    // Escala común: el alto pedido es el de una mayúscula (H); las demás guardan su proporción
    const gh = ch => { const bb = font.charToGlyph(ch).getBoundingBox(); return Math.max(1, bb.y2 - bb.y1); };
    const k = v.height / gh('H');
    const solidOf = shape2d => {
      if (v.style === 'hollow') {
        const innerCs = shape2d.offset(-v.wall, 'Round', 2, 24);
        let s = slab(shape2d, v.depth);
        if (!innerCs.isEmpty()) s = s.subtract(slab(innerCs, v.depth, v.front));
        return s;
      }
      return slab(shape2d, v.depth);
    };
    const parts = [];
    let x = 0;
    for (const ch of chars) {
      // Cada letra en su tamaño real (misma escala para todas)
      const g = textShape(font, ch, { height: gh(ch) * k });
      const gb = g.bounds();
      const gw = gb.max[0] - gb.min[0], gH = gb.max[1] - gb.min[1];
      const nx = Math.ceil(gw / v.bedX), ny = Math.ceil(gH / v.bedY);
      const tw = gw / nx, th = gH / ny;
      const tiles = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const cell = CrossSection.square([tw, th], false).translate([gb.min[0] + i * tw, gb.min[1] + j * th]);
        const t = g.intersect(cell);
        if (!t.isEmpty() && t.area() > 4) tiles.push({ i, j, shape: t, solid: solidOf(t) });
      }
      // Pernos: en cada corte, dos agujeros que cruzan la unión (mitad en cada parte)
      if (tiles.length > 1 && v.depth >= 8) {
        const rP = v.pinD / 2 + 0.15, L = Math.min(24, v.depth * 1.6);
        const zc = v.style === 'hollow' ? v.front + (v.depth - v.front) / 2 : v.depth / 2;
        const holes = [];
        const safe = g.offset(-(rP + (v.style === 'hollow' ? 0 : 2.5)), 'Round', 2, 16);
        const along = (fixed, from, to, vertical) => {
          const found = [];
          for (let s = 0.2; s <= 0.8; s += 0.05) {
            const u = from + (to - from) * s;
            const [px, py] = vertical ? [fixed, u] : [u, fixed];
            // Lejos del borde para que el agujero quede adentro del material
            if (inside(safe, px, py)) found.push([px, py]);
          }
          const pick = found.length > 2 ? [found[0], found[found.length - 1]] : found;
          for (const [px, py] of pick) {
            const c = Manifold.cylinder(L, rP, rP, 24, true);
            holes.push((vertical ? c.rotate([0, 90, 0]) : c.rotate([90, 0, 0])).translate([px, py, zc]));
          }
        };
        for (let i = 1; i < nx; i++) along(gb.min[0] + i * tw, gb.min[1], gb.max[1], true);
        for (let j = 1; j < ny; j++) along(gb.min[1] + j * th, gb.min[0], gb.max[0], false);
        if (holes.length) { const H = Manifold.union(holes); for (const t of tiles) t.solid = t.solid.subtract(H); }
      }
      // Agujeros para colgar (en la cara de atrás, que es la de arriba al imprimir)
      if (v.style === 'solid' && v.hang && v.depth >= 8) {
        const ys = gb.max[1] - gH * 0.2, safeH = g.offset(-4, 'Round', 2, 16);
        const hooks = [gb.min[0] + gw * 0.3, gb.min[0] + gw * 0.7].filter(hx => inside(safeH, hx, ys));
        if (!hooks.length && inside(safeH, (gb.min[0] + gb.max[0]) / 2, ys)) hooks.push((gb.min[0] + gb.max[0]) / 2);
        const hole = Manifold.cylinder(6, 2.5, 2.5, 24).translate([0, 0, v.depth - 6 + 0.01]);
        for (const t of tiles) for (const hx of hooks) if (inside(t.shape, hx, ys, 0.2)) t.solid = t.solid.subtract(hole.translate([hx, ys, 0]));
      }
      // Se acomodan en fila, cada parte separada para verlas y exportarlas por separado
      const ox = 0;
      for (const t of tiles) {
        const name = tiles.length > 1 ? `${ch} (parte ${tiles.indexOf(t) + 1} de ${tiles.length})` : ch;
        const shift = [x - gb.min[0] + t.i * 12 + ox, -gb.min[1] + t.j * 12, 0];
        parts.push(part(name, v.color, t.solid.translate(shift)));
      }
      x += gw + 15 + (nx - 1) * 12;
    }
    return parts;
  },
};
