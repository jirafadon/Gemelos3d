/**
 * Soportes de celular plegables:
 * - De bolsillo: una tarjeta de una pieza con dos hojas articuladas impresas en el lugar
 *   (bisagras con perno y holgura): la pata se abre por atrás y el tope se levanta adelante.
 *   Entra en el bolsillo o como llavero.
 * - Multiángulo: base con ranuras a 50°, 60°, 70° y 80° y un respaldo con tope que se encastra
 *   en la que quieras.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

/**
 * Bisagra a lo largo de X, centrada en (y0, z=r), de x0 a x1.
 * Devuelve { fixed, moving, cutFixed, cutMoving }: nudillos de cada lado y lo que hay que sacar alrededor.
 */
function hinge(x0, x1, y0, r, g, n) {
  const { Manifold } = wasm();
  const L = x1 - x0, seg = (L - g * (n - 1)) / n;
  const cyl = (rad, a, b) => Manifold.cylinder(b - a, rad, rad, 40).rotate([0, 90, 0]).translate([a, y0, r]);
  const fixed = [], moving = [], cutFixed = [], cutMoving = [];
  for (let i = 0; i < n; i++) {
    const a = x0 + i * (seg + g), b = a + seg;
    if (i % 2 === 0) { fixed.push(cyl(r, a, b)); cutMoving.push(cyl(r + g, a - g, b + g)); }
    else { moving.push(cyl(r, a, b).subtract(cyl(r * 0.45 + g, a - 1, b + 1))); cutFixed.push(cyl(r + g, a - g, b + g)); }
  }
  // Perno: une los nudillos fijos y pasa por adentro de los móviles
  const pin = cyl(r * 0.45, x0 + seg * 0.5, x1 - seg * 0.5);
  const pinClear = cyl(r * 0.45 + g, x0 - 1, x1 + 1);
  return { fixed: Manifold.union([...fixed, pin]), moving: Manifold.union(moving), cutFixed: Manifold.union(cutFixed), cutMoving: Manifold.union(cutMoving), pinClear };
}

export default {
  id: 'soporte-plegable',
  title: 'Soportes plegables',
  description: 'De bolsillo (una pieza con bisagras impresas, también como llavero) o multiángulo con ranuras a 50°, 60°, 70° y 80°.',
  fileName: v => `soporte_${v.kind}_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Soporte' },
    { key: 'kind', type: 'segment', label: 'Tipo', default: 'pocket', options: [{ value: 'pocket', label: 'De bolsillo' }, { value: 'multi', label: 'Multiángulo' }] },
    { key: 'w', type: 'number', label: 'Ancho', default: 56, min: 40, max: 120, step: 1, unit: 'mm' },
    { key: 'h', type: 'number', label: 'Alto', default: 86, min: 60, max: 160, step: 1, unit: 'mm', show: v => v.kind === 'pocket' },
    { key: 't', type: 'number', label: 'Espesor', default: 4, min: 3, max: 6, step: 0.2, unit: 'mm', show: v => v.kind === 'pocket' },
    { key: 'gap', type: 'number', label: 'Holgura de las bisagras', default: 0.35, min: 0.2, max: 0.7, step: 0.05, unit: 'mm', show: v => v.kind === 'pocket', hint: 'Si salen pegadas, subila. Imprimí sin soportes.' },
    { key: 'keyring', type: 'toggle', label: 'Agujero de llavero', default: true, show: v => v.kind === 'pocket' },
    { key: 'phoneT', type: 'number', label: 'Espesor del celular con funda', default: 11, min: 6, max: 20, step: 0.5, unit: 'mm', show: v => v.kind === 'multi' },
    { key: 'backH', type: 'number', label: 'Alto del respaldo', default: 90, min: 50, max: 160, step: 1, unit: 'mm', show: v => v.kind === 'multi' },
    { key: 'tol', type: 'number', label: 'Holgura de las ranuras', default: 0.3, min: 0.1, max: 0.8, step: 0.05, unit: 'mm', show: v => v.kind === 'multi' },

    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre o texto', default: 'Gemelos 3D' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => !!(v.text || '').trim() },

    { type: 'group', label: 'Colores' },
    { key: 'color', type: 'color', label: 'Color', default: '#2A9D8F' },
    { key: 'color2', type: 'color', label: 'Texto', default: '#F5F5F5', show: v => !!(v.text || '').trim() },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const font = (v.text || '').trim() ? await ctx.font(v.font) : null;
    const parts = [];

    if (v.kind === 'pocket') {
      const W = v.w, H = v.h, t = v.t, r = t / 2, g = v.gap;
      let card = slab(roundedRect(W, H, 6), t);
      // Pata: ventana en la parte de arriba, articulada en su borde de arriba (se abre hacia atrás)
      const lw = W * 0.62, lh = H * 0.5, ly1 = H / 2 - 9, ly0 = ly1 - lh;
      const legWin = roundedRect(lw + 2 * g, lh + 2 * g, 3).translate([0, (ly0 + ly1) / 2]);
      card = card.subtract(slab(legWin, t + 1, -0.5));
      let leg = slab(roundedRect(lw, lh - r - g, 3).translate([0, (ly0 + ly1 - r - g) / 2]), t);
      const h1 = hinge(-lw / 2, lw / 2, ly1 - r, r, g, 5);
      // Tope: tira de abajo, articulada en su borde de arriba (se levanta hacia adelante)
      const sh = 14, sy0 = -H / 2 + 5, sy1 = sy0 + sh;
      const stopWin = roundedRect(W - 10 + 2 * g, sh + 2 * g, 2).translate([0, (sy0 + sy1) / 2]);
      card = card.subtract(slab(stopWin, t + 1, -0.5));
      let stop = slab(roundedRect(W - 10, sh - r - g, 2).translate([0, (sy0 + sy1 - r - g) / 2]), t);
      const h2 = hinge(-(W - 10) / 2, (W - 10) / 2, sy1 - r, r, g, 5);
      // La tarjeta llega hasta el eje de cada bisagra (para unirse a sus nudillos) y cada hoja también,
      // del otro lado; alrededor de los nudillos ajenos se deja la holgura
      const strip = (w, ya, yb) => slab(CrossSection.square([w, yb - ya], false).translate([-w / 2, ya]), t);
      card = card.add(strip(lw + 2 * g, ly1 - r, ly1 + g + 0.01)).add(strip(W - 10 + 2 * g, sy1 - r, sy1 + g + 0.01));
      card = card.subtract(h1.cutFixed).subtract(h2.cutFixed).add(h1.fixed).add(h2.fixed);
      leg = leg.add(slab(CrossSection.square([lw, r + g + 0.5], true).translate([0, ly1 - r - (r + g + 0.5) / 2]), t)).subtract(h1.cutMoving).add(h1.moving).subtract(h1.pinClear);
      stop = stop.add(slab(CrossSection.square([W - 10, r + g + 0.5], true).translate([0, sy1 - r - (r + g + 0.5) / 2]), t)).subtract(h2.cutMoving).add(h2.moving).subtract(h2.pinClear);
      if (v.keyring) card = card.subtract(Manifold.cylinder(t + 2, 2.6, 2.6, 32).translate([W / 2 - 7, H / 2 - 7, -1]));
      parts.push(part('Tarjeta', v.color, card), part('Pata', v.color, leg), part('Tope', v.color, stop));
      if (font) {
        const band = roundedRect(W - 10, ly0 - sy1 - 4, 2).translate([0, (ly0 + sy1) / 2]);
        const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), W - 14, Math.max(4, ly0 - sy1 - 8)).translate([0, (ly0 + sy1) / 2]).intersect(band);
        if (!txt.isEmpty()) { const inl = slab(txt, 0.6, t - 0.6); parts[0] = part('Tarjeta', v.color, card.subtract(inl)); parts.push(part('Texto', v.color2, inl)); }
      }
      // Las tres hojas van como piezas separadas (no se unen: tienen que girar)
      return v._raw ? parts : mergeByColor(parts);
    }

    // ---------- Multiángulo ----------
    const W = v.w, bt = 4, tol = v.tol, depth = 70, baseH = 12;
    // Base con 4 ranuras inclinadas (el respaldo entra apoyado contra la pared trasera de cada ranura)
    let base = slab(roundedRect(W, depth, 6), baseH);
    const angles = [50, 60, 70, 80];
    angles.forEach((a, i) => {
      const y = -depth / 2 + 16 + i * 13;
      const slot = Manifold.cube([W + 2, bt + 2 * tol, baseH * 3], false).translate([-W / 2 - 1, -(bt + 2 * tol) / 2, 0])
        .rotate([-(90 - a), 0, 0]).translate([0, y, 3]);
      base = base.subtract(slot);
    });
    // Marcas de grado en el costado
    if (font) angles.forEach((a, i) => {
      const y = -depth / 2 + 16 + i * 13;
      const lbl = fitInto(stackLines([{ font, text: `${a}°`, height: 10 }]), 9, 4).rotate(90).translate([0, 0]);
      base = base.subtract(slab(lbl, 0.8, 0).rotate([0, -90, 0]).translate([-W / 2 + 0.6, y + 4, baseH / 2]));
    });
    // Respaldo con tope abajo (se imprime acostado)
    const backH = v.backH, lipH = v.phoneT + 4;
    let back = slab(roundedRect(W, backH, 4), bt);
    back = back.add(slab(roundedRect(W, 5, 2).translate([0, -backH / 2 + 12 + 2.5]), lipH, bt - 0.01));
    back = back.add(slab(roundedRect(W, 3, 1.4).translate([0, -backH / 2 + 12 + 6.5]), 6, bt + lipH - 0.02).subtract(slab(roundedRect(W + 2, 6, 0).translate([0, -backH / 2 + 12 + 9.5]), 7, bt + lipH - 1)));
    // Ventana para el cable
    back = back.subtract(slab(roundedRect(14, 20, 6).translate([0, -backH / 2 + 12 + 2]), bt + lipH + 10, -1));
    back = back.translate([W + 10, 0, 0]);
    parts.push(part('Base', v.color, base), part('Respaldo', v.color, back));
    if (font) {
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), W - 10, 14).translate([W + 10, backH / 2 - 16]);
      const inl = slab(txt, 0.6, bt - 0.6);
      parts[1] = part('Respaldo', v.color, back.subtract(inl));
      parts.push(part('Texto', v.color2, inl));
    }
    return mergeByColor(parts);
  },
};
