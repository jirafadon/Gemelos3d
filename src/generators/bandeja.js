/**
 * Bandejas organizadoras tipo Bento: medidas, grilla de divisiones, redondeo,
 * apilables (encastran una sobre otra), paredes caladas, etiqueta y muesca para el dedo.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

export default {
  id: 'bandeja',
  title: 'Bandejas organizadoras',
  description: 'Bandeja a medida con divisiones en grilla, apilable, con paredes caladas, etiqueta y muesca para el dedo.',
  fileName: v => `bandeja_${v.width}x${v.depth}x${v.height}`,
  params: [
    { type: 'group', label: 'Medidas' },
    { key: 'width', type: 'number', label: 'Ancho', default: 120, min: 20, max: 300, step: 1, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 90, min: 20, max: 300, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 30, min: 8, max: 150, step: 1, unit: 'mm' },
    { key: 'measure', type: 'segment', label: 'Las medidas son', default: 'outside', options: [{ value: 'outside', label: 'Por fuera' }, { value: 'inside', label: 'Por dentro' }] },
    { key: 'wall', type: 'number', label: 'Espesor de pared', default: 2, min: 0.8, max: 6, step: 0.1, unit: 'mm' },
    { key: 'bottom', type: 'number', label: 'Fondo', default: 1.6, min: 0.8, max: 6, step: 0.2, unit: 'mm' },
    { key: 'fillet', type: 'number', label: 'Redondeo de esquinas', default: 4, min: 0, max: 25, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Divisiones' },
    { key: 'cols', type: 'number', label: 'Columnas', default: 3, min: 1, max: 12, step: 1, unit: '' },
    { key: 'rows', type: 'number', label: 'Filas', default: 2, min: 1, max: 12, step: 1, unit: '' },
    { key: 'colSizes', type: 'text', label: 'Anchos de las columnas (opcional)', default: '', hint: 'Proporciones separadas por coma, por ejemplo "2,1,1" hace la primera el doble de ancha.' },
    { key: 'rowSizes', type: 'text', label: 'Profundidad de las filas (opcional)', default: '' },
    { key: 'divT', type: 'number', label: 'Espesor de las divisiones', default: 1.4, min: 0.6, max: 4, step: 0.1, unit: 'mm' },
    { key: 'divH', type: 'number', label: 'Alto de las divisiones', default: 100, min: 20, max: 100, step: 1, unit: '%' },
    { key: 'scoop', type: 'toggle', label: 'Fondo curvo en el frente (para sacar cosas chicas)', default: false },

    { type: 'group', label: 'Extras' },
    { key: 'stack', type: 'toggle', label: 'Apilable', default: false, hint: 'Abajo lleva un escalón que entra en la bandeja de abajo.' },
    { key: 'pattern', type: 'segment', label: 'Paredes', default: 'none', options: [{ value: 'none', label: 'Lisas' }, { value: 'hex', label: 'Panal' }, { value: 'slots', label: 'Ranuras' }] },
    { key: 'pull', type: 'toggle', label: 'Muesca para el dedo', default: false },
    { key: 'label', type: 'text', label: 'Etiqueta en el frente', default: '' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'poppins', show: v => !!(v.label || '').trim() },
    { key: 'color', type: 'color', label: 'Color', default: '#457B9D' },
    { key: 'color2', type: 'color', label: 'Color de la etiqueta', default: '#F5F5F5', show: v => !!(v.label || '').trim() },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const t = v.wall;
    const W = v.measure === 'inside' ? v.width + 2 * t : v.width;
    const D = v.measure === 'inside' ? v.depth + 2 * t : v.depth;
    const H = v.height;
    const r = Math.min(v.fillet, W / 2 - 0.5, D / 2 - 0.5);
    const outer = roundedRect(W, D, r), inner = roundedRect(W - 2 * t, D - 2 * t, Math.max(0, r - t));
    const stackH = v.stack ? 3 : 0, gap = 0.25;
    const z0 = v.bottom + stackH, top = H + stackH;
    let body = slab(outer, H, stackH).subtract(slab(inner, H, z0));
    if (v.stack) {
      // El pie entra en la bandeja de abajo: un aro más chico que el hueco de adentro
      const foot = roundedRect(W - 2 * t - 2 * gap, D - 2 * t - 2 * gap, Math.max(0, r - t - gap));
      const footIn = foot.offset(-t, 'Round', 2, 24);
      body = body.add(slab(foot, stackH + 0.02).subtract(slab(footIn, stackH + 0.04, -0.01)));
    }

    // Divisiones según proporciones
    const sizes = (str, n) => { const a = String(str || '').split(/[,;\s]+/).map(Number).filter(x => x > 0); const list = a.length === n ? a : Array(n).fill(1); const s = list.reduce((x, y) => x + y, 0); return list.map(x => x / s); };
    const cw = sizes(v.colSizes, v.cols), rw = sizes(v.rowSizes, v.rows);
    const iw = W - 2 * t, id = D - 2 * t, dh = (top - z0) * (v.divH / 100);
    let divs = null;
    let acc = -iw / 2;
    for (let i = 0; i < v.cols - 1; i++) { acc += cw[i] * iw; const d = Manifold.cube([v.divT, id + 0.02, dh], false).translate([acc - v.divT / 2, -id / 2 - 0.01, z0 - 0.01]); divs = divs ? divs.add(d) : d; }
    acc = -id / 2;
    for (let j = 0; j < v.rows - 1; j++) { acc += rw[j] * id; const d = Manifold.cube([iw + 0.02, v.divT, dh], false).translate([-iw / 2 - 0.01, acc - v.divT / 2, z0 - 0.01]); divs = divs ? divs.add(d) : d; }
    if (divs) body = body.add(divs.intersect(slab(inner, top)));

    // Fondo curvo en la pared del frente de cada fila delantera
    if (v.scoop) {
      const R = Math.min(15, (top - z0) * 0.6);
      const fillet = Manifold.cube([iw, R, R], false).subtract(Manifold.cylinder(iw + 2, R, R, 48).rotate([0, 90, 0]).translate([-1, R, R])).translate([-iw / 2, -id / 2, z0]);
      body = body.add(fillet.intersect(slab(inner, top)));
    }

    // Paredes caladas (en los cuatro lados, dejando marco arriba y abajo)
    if (v.pattern !== 'none') {
      const band = top - z0 - 6;
      if (band > 6) {
        const holes = [];
        const add = (len, place) => {
          const pitch = v.pattern === 'hex' ? 7 : 6;
          const n = Math.floor((len - 2 * r - 6) / pitch);
          for (let i = 0; i < n; i++) {
            const x = -((n - 1) * pitch) / 2 + i * pitch;
            const rows = v.pattern === 'hex' ? Math.floor(band / 6.2) : 1;
            for (let k = 0; k < rows; k++) {
              const zc = z0 + 3 + (v.pattern === 'hex' ? 3 + k * 6.2 : band / 2);
              const xo = v.pattern === 'hex' && k % 2 ? pitch / 2 : 0;
              if (Math.abs(x + xo) > len / 2 - r - 4) continue;
              const cs = v.pattern === 'hex' ? CrossSection.circle(2.8, 6).rotate(30) : roundedRect(2.4, band, 1.2);
              holes.push(place(cs.extrude(t * 3, 0, 0, [1, 1], true), x + xo, zc));
            }
          }
        };
        add(W, (m, x, z) => m.rotate([90, 0, 0]).translate([x, D / 2 - t / 2, z]));
        add(W, (m, x, z) => m.rotate([90, 0, 0]).translate([x, -D / 2 + t / 2, z]));
        add(D, (m, y, z) => m.rotate([90, 0, 90]).translate([W / 2 - t / 2, y, z]));
        add(D, (m, y, z) => m.rotate([90, 0, 90]).translate([-W / 2 + t / 2, y, z]));
        if (holes.length) body = body.subtract(Manifold.union(holes));
      }
    }

    // Muesca para el dedo en la pared del frente
    if (v.pull) {
      const pw = Math.min(30, W * 0.3), pd = Math.min(12, (top - z0) * 0.5);
      body = body.subtract(Manifold.cylinder(t * 4, pw / 2, pw / 2, 64).rotate([90, 0, 0]).scale([1, 1, pd / (pw / 2)]).translate([0, -D / 2 + t * 2, top]));
    }

    const parts = [part('Bandeja', v.color, body)];
    // Etiqueta en relieve sobre la pared del frente
    if ((v.label || '').trim()) {
      const font = await ctx.font(v.font);
      const lh = Math.min(10, (top - z0) * 0.35);
      const txt = fitInto(stackLines([{ font, text: v.label, height: 10 }]), Math.min(W * 0.7, 90), lh);
      const zc = v.pull ? z0 + (top - z0) * 0.35 : (z0 + top) / 2;
      const lab = txt.extrude(0.8 + 0.4).rotate([90, 0, 0]).translate([0, -D / 2 + 0.4, zc]);
      parts.push(part('Etiqueta', v.color2, lab.subtract(body)));
    }
    return mergeByColor(parts);
  },
};
