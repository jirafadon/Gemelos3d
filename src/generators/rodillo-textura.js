/**
 * Rodillo texturizado para masas, fondant o porcelana fría: un cilindro con un patrón
 * en relieve (corazones, estrellas, puntos, rombos, ondas, copos o tu texto repetido)
 * y agujero para un palito de madera como eje. El texto va espejado para que se lea en la masa.
 */
import { wasm, circle, roundedRect, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart, star, snowflake } from '../engine/shapes.js';

export default {
  id: 'rodillo-textura',
  title: 'Rodillo texturizado',
  description: 'Rodillo con patrón en relieve (corazones, estrellas, rombos, copos o tu texto) para masas y porcelana fría.',
  fileName: v => `rodillo_${v.pattern}`,
  params: [
    { type: 'group', label: 'Rodillo' },
    { key: 'length', type: 'number', label: 'Largo', default: 120, min: 40, max: 250, step: 1, unit: 'mm' },
    { key: 'd', type: 'number', label: 'Diámetro', default: 40, min: 20, max: 80, step: 1, unit: 'mm' },
    { key: 'axle', type: 'number', label: 'Agujero para el eje', default: 8.4, min: 0, max: 20, step: 0.1, unit: 'mm', hint: 'Para un palito de madera de 8 mm. 0 = macizo.' },
    { key: 'handles', type: 'toggle', label: 'Bordes lisos en las puntas', default: true, hint: 'Dos aros sin patrón que marcan el espesor de la masa.' },

    { type: 'group', label: 'Patrón' },
    { key: 'pattern', type: 'select', label: 'Patrón', default: 'hearts', options: [{ value: 'hearts', label: 'Corazones' }, { value: 'stars', label: 'Estrellas' }, { value: 'dots', label: 'Puntos' }, { value: 'diamonds', label: 'Rombos' }, { value: 'waves', label: 'Ondas' }, { value: 'flakes', label: 'Copos' }, { value: 'text', label: 'Mi texto' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'Feliz cumple', show: v => v.pattern === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => v.pattern === 'text' },
    { key: 'cell', type: 'number', label: 'Tamaño del dibujo', default: 12, min: 5, max: 40, step: 0.5, unit: 'mm' },
    { key: 'gapP', type: 'number', label: 'Separación', default: 4, min: 1, max: 20, step: 0.5, unit: 'mm' },
    { key: 'relief', type: 'number', label: 'Relieve', default: 1.4, min: 0.6, max: 3, step: 0.1, unit: 'mm' },
    { key: 'stagger', type: 'toggle', label: 'Filas intercaladas', default: true },
    { key: 'color', type: 'color', label: 'Color', default: '#F4A261' },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const R = v.d / 2, L = v.length, edge = v.handles ? 8 : 0;
    let body = Manifold.cylinder(L, R, R, 128);
    if (v.axle > 0) body = body.subtract(Manifold.cylinder(L + 2, v.axle / 2, v.axle / 2, 48).translate([0, 0, -1]));
    if (v.handles) for (const z of [0, L - edge]) body = body.add(Manifold.cylinder(edge, R + v.relief, R + v.relief, 128).translate([0, 0, z]));
    // Patrón plano: x = alrededor (circunferencia), y = a lo largo
    const C = 2 * Math.PI * R, len = L - 2 * edge - 2;
    let tile;
    const s = v.cell;
    if (v.pattern === 'text') {
      const font = await ctx.font(v.font);
      tile = fitInto(stackLines([{ font, text: v.text || ' ', height: 10 }]), s * 4, s).mirror([1, 0]);
    } else tile = {
      hearts: () => fitInto(heart(10), s, s), stars: () => star(s, 5, 0.45, 0.4), dots: () => circle(s / 2, 32),
      diamonds: () => fitInto(circle(1, 4), s, s * 1.3), flakes: () => snowflake(s), waves: () => null,
    }[v.pattern]();
    const items = [];
    if (v.pattern === 'waves') {
      const rows = Math.floor(len / (s * 0.6 + v.gapP));
      for (let j = 0; j < rows; j++) {
        const pts = [];
        for (let i = 0; i <= 120; i++) { const x = -C / 2 + C * i / 120; pts.push([x, j * (s * 0.6 + v.gapP) + Math.sin(i / 120 * Math.PI * 2 * Math.max(2, Math.round(C / (s * 2)))) * s * 0.3]); }
        const band = new CrossSection([[...pts, ...pts.slice().reverse().map(([x, y]) => [x, y + s * 0.25])]], 'NonZero');
        items.push(band);
      }
    } else {
      const tb = tile.bounds(), tw = tb.max[0] - tb.min[0], th = tb.max[1] - tb.min[1];
      const nx = Math.max(1, Math.floor(C / (tw + v.gapP))), stepX = C / nx; // entra justo alrededor
      const ny = Math.max(1, Math.floor(len / (th + v.gapP)));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const off = v.stagger && j % 2 ? stepX / 2 : 0;
        items.push(tile.translate([-C / 2 + (i + 0.5) * stepX + off - (tb.min[0] + tb.max[0]) / 2, (j + 0.5) * (len / ny) - (tb.min[1] + tb.max[1]) / 2]));
      }
    }
    const flat = CrossSection.union(items);
    let pat = flat.extrude(v.relief + 0.5).translate([0, 0, -0.5]).refineToLength(1.5);
    const z0 = edge + 1;
    pat = pat.warp(p => { const a = p[0] / R, r = R + p[2]; const z = z0 + p[1]; p[0] = Math.cos(a) * r; p[1] = Math.sin(a) * r; p[2] = z; });
    body = body.add(pat.intersect(Manifold.cylinder(L - 2 * edge, R + v.relief + 1, R + v.relief + 1, 128).translate([0, 0, edge])));
    return mergeByColor([part('Rodillo', v.color, body)]);
  },
};
