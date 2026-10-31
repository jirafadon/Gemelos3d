/**
 * Trofeo: figura plana (copa, estrella, medalla o escudo) con texto en otro color,
 * parada en una base escalonada con ranura y el nombre en relieve al frente.
 * Figura y base se imprimen por separado, acostadas, sin soportes.
 */
import { wasm, circle, roundedRect, polygonShape, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, placeBelow } from '../engine/layers.js';
import { star, fitInto, smooth } from '../engine/shapes.js';
import { ball, birrete } from '../engine/icons2d.js';
import { firstLine, textPlaceParams, placeText } from './_common.js';

/** Silueta de copa de trofeo (alto ≈ s). */
function cup(s) {
  const { CrossSection } = wasm();
  const bowl = circle(s * 0.3, 96).intersect(CrossSection.square([s, s * 0.3], false).translate([-s / 2, -s * 0.3])).translate([0, s * 0.72])
    .add(CrossSection.square([s * 0.6, s * 0.12], true).translate([0, s * 0.78]));
  const handles = [-1, 1].map(k => circle(s * 0.14, 48).subtract(circle(s * 0.085, 48)).translate([k * s * 0.31, s * 0.66]));
  const stem = polygonShape([[-s * 0.05, s * 0.43], [s * 0.05, s * 0.43], [s * 0.035, s * 0.2], [-s * 0.035, s * 0.2]]);
  const foot = roundedRect(s * 0.34, s * 0.06, s * 0.02).translate([0, s * 0.17]).add(roundedRect(s * 0.44, s * 0.1, s * 0.03).translate([0, s * 0.09]));
  return smooth(CrossSection.union([bowl, ...handles, stem, foot]), s * 0.008);
}
/** Escudo: arriba recto, costados que bajan curvos hasta una punta. */
function shield(s) {
  const right = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; right.push([s * 0.4 * Math.cos(t * Math.PI / 2) ** 0.7, s * 0.6 * (1 - t)]); }
  const pts = [[-s * 0.4, s], [s * 0.4, s], ...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  return smooth(polygonShape(pts), s * 0.01);
}

export default {
  id: 'trofeo',
  title: 'Diseñá tu trofeo',
  description: 'Copa, estrella, medalla, escudo, pelota o birrete con texto, sobre base con dos líneas al frente.',
  fileName: v => `trofeo_${firstLine(v.name, v.title)}`,
  params: [
    { type: 'group', label: 'Figura' },
    { key: 'figure', type: 'segment', label: 'Figura', default: 'cup', options: [{ value: 'cup', label: 'Copa' }, { value: 'star', label: 'Estrella' }, { value: 'medal', label: 'Medalla' }, { value: 'shield', label: 'Escudo' }, { value: 'ball', label: 'Pelota' }, { value: 'birrete', label: 'Birrete' }] },
    { key: 'size', type: 'number', label: 'Alto de la figura', default: 110, min: 50, max: 220, step: 1, unit: 'mm' },
    { key: 'title', type: 'text', label: 'Texto en la figura', default: '1°', multiline: true },
    { key: 'titleFont', type: 'font', label: 'Tipografía', default: 'bangers' },
    { key: 'thick', type: 'number', label: 'Espesor de la figura', default: 4, min: 2.4, max: 10, step: 0.2, unit: 'mm' },

    ...textPlaceParams(),
    { type: 'group', label: 'Base' },
    { key: 'name', type: 'text', label: 'Línea 1 al frente', default: 'Juan Pérez' },
    { key: 'name2', type: 'text', label: 'Línea 2 al frente (opcional)', default: 'Campeón 2026' },
    { key: 'nameFont', type: 'font', label: 'Tipografía del nombre', default: 'poppins' },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cFig', type: 'color', label: 'Figura', default: '#FCBF49' },
    { key: 'cText', type: 'color', label: 'Texto de la figura', default: '#1E1E1E' },
    { key: 'cBase', type: 'color', label: 'Base', default: '#1E1E1E' },
    { key: 'cName', type: 'color', label: 'Nombre de la base', default: '#FCBF49' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const S = v.size;
    const tab = 8; // lengüeta que entra en la base
    let fig = v.figure === 'cup' ? cup(S) : v.figure === 'star' ? star(S, 5, 0.45, S * 0.02).translate([0, S / 2])
      : v.figure === 'medal' ? circle(S * 0.42, 128).translate([0, S * 0.5]).add(polygonShape([[-S * 0.22, S * 0.15], [S * 0.22, S * 0.15], [S * 0.08, S * 0.02], [-S * 0.08, S * 0.02]]))
        : v.figure === 'ball' ? ball(S * 0.8).translate([0, S * 0.45]).add(roundedRect(S * 0.3, S * 0.12, 2).translate([0, S * 0.05]))
          : v.figure === 'birrete' ? birrete(S).translate([0, S * 0.5])
            : shield(S);
    const fb = fig.bounds();
    fig = fig.translate([0, -fb.min[1] + tab]);
    const figB = fig.bounds();
    const tabW = Math.min(30, (figB.max[0] - figB.min[0]) * 0.4);
    fig = fig.add(CrossSection.square([tabW, tab + 2], false).translate([-tabW / 2, 0]));
    // Zona para el texto de la figura
    const area = v.figure === 'cup' ? [S * 0.42, S * 0.22, S * 0.69] : v.figure === 'star' ? [S * 0.38, S * 0.26, S * 0.5 + tab] : v.figure === 'medal' ? [S * 0.56, S * 0.4, S * 0.5 + tab]
      : v.figure === 'ball' ? [S * 0.2, S * 0.14, S * 0.45 + tab + S * 0.02] : v.figure === 'birrete' ? [S * 0.36, S * 0.16, S * 0.4 + tab] : [S * 0.5, S * 0.36, S * 0.62];
    const tf = await ctx.font(v.titleFont);
    const title = placeText(fitInto(stackLines(String(v.title || ' ').split('\n').map(t => ({ font: tf, text: t, height: 10 })), 1.5), area[0], area[1]).translate([0, area[2]]), v, fig.subtract(CrossSection.square([tabW, tab + 2], false).translate([-tabW / 2, 0])));
    const L = 0.8;
    const parts = [part('Figura', v.cFig, slab(fig, v.thick)), part('Texto de la figura', v.cText, slab(title, L, v.thick))];

    // Base escalonada con ranura y nombre en relieve al frente
    const bw = Math.max(70, (figB.max[0] - figB.min[0]) * 0.85), bd = 40;
    let base = slab(roundedRect(bw, bd, 4), 10).add(slab(roundedRect(bw - 12, bd - 10, 3), 8, 9.99));
    base = base.subtract(Manifold.cube([tabW + 2 * v.tol, v.thick + 2 * v.tol, tab + 1], false).translate([-(tabW + 2 * v.tol) / 2, -(v.thick + 2 * v.tol) / 2, 18 - tab]));
    const nf = await ctx.font(v.nameFont);
    const lines = [v.name, v.name2].filter(t => (t || '').trim()).map((t, i) => ({ font: nf, text: t, height: i ? 7 : 10 }));
    const nm = lines.length ? fitInto(stackLines(lines, 1.5), bw - 10, lines.length > 1 ? 8 : 6) : null;
    const all = parts.reduce((a, p) => (a ? a.add(p.solid) : p.solid), null);
    const placed = placeBelow(base, all, 12);
    const pb = placed.boundingBox(), sb = base.boundingBox();
    const d = [pb.min[0] - sb.min[0], pb.min[1] - sb.min[1], 0];
    parts.push(part('Base', v.cBase, placed));
    if (nm) parts.push(part('Nombre', v.cName, nm.extrude(1).rotate([90, 0, 0]).translate([d[0], d[1] - bd / 2, 5])));
    return mergeByColor(parts);
  },
};
