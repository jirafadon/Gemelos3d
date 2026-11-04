/**
 * Funda para vaso de café (manga): un anillo cónico a la medida del vaso, con nombres
 * o una frase alrededor (en relieve de otro color o calados) y una banda de rayas o corazones.
 * Se imprime parada, sin soportes.
 */
import { wasm, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart, star } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'funda-vaso',
  title: 'Funda para vaso',
  description: 'Manga a medida de tu vaso de café o térmico, con nombres o frase alrededor, en relieve o calados.',
  fileName: v => `funda_vaso_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Vaso' },
    { key: 'dTop', type: 'number', label: 'Diámetro arriba de la funda', default: 88, min: 50, max: 130, step: 0.5, unit: 'mm', hint: 'Medí el vaso a la altura donde termina la funda.' },
    { key: 'dBot', type: 'number', label: 'Diámetro abajo de la funda', default: 74, min: 40, max: 130, step: 0.5, unit: 'mm' },
    { key: 'h', type: 'number', label: 'Alto de la funda', default: 55, min: 20, max: 140, step: 1, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.4, min: 0, max: 2, step: 0.1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 1.2, max: 4, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Texto alrededor' },
    { key: 'text', type: 'text', label: 'Nombres o frase', default: 'Ana · Tomi · Lola', hint: 'Usá · o ♥ para separar nombres.' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'textH', type: 'number', label: 'Alto del texto', default: 60, min: 20, max: 90, step: 1, unit: '%' },
    { key: 'repeat', type: 'number', label: 'Veces alrededor', default: 1, min: 1, max: 4, step: 1, unit: '' },
    { key: 'style', type: 'segment', label: 'Cómo va', default: 'raised', options: [{ value: 'raised', label: 'En relieve' }, { value: 'cut', label: 'Calado' }], hint: v => (v.style === 'cut' ? 'Calado: los centros de letras como la a o la o quedan huecos. Las tipografías cursivas unidas quedan mejor.' : '') },
    { key: 'band', type: 'segment', label: 'Bordes', default: 'hearts', options: [{ value: 'none', label: 'Lisos' }, { value: 'stripes', label: 'Rayas' }, { value: 'hearts', label: 'Corazones' }, { value: 'stars', label: 'Estrellas' }] },

    { type: 'group', label: 'Colores' },
    { key: 'cBody', type: 'color', label: 'Funda', default: '#C1121F' },
    { key: 'cText', type: 'color', label: 'Texto y detalles', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    const r0 = v.dBot / 2 + v.tol, r1 = v.dTop / 2 + v.tol, H = v.h, t = v.wall;
    const rAt = z => r0 + (r1 - r0) * (z / H);
    // Anillo cónico por revolución del perfil
    const prof = new CrossSection([[[r0, 0], [r0 + t, 0], [r1 + t, H], [r1, H]]], 'Positive');
    let body = Manifold.revolve(prof, 160);
    // Dibujo plano (x = largo del contorno a media altura, y = alto) que después se envuelve
    const rm = rAt(H / 2) + t, circ = 2 * Math.PI * rm;
    const font = await ctx.font(v.font);
    const n = Math.max(1, Math.round(v.repeat));
    const one = fitInto(stackLines([{ font, text: v.text || ' ', height: 10 }]), circ / n * 0.9, H * v.textH / 100);
    const flats = [];
    for (let i = 0; i < n; i++) flats.push(one.translate([-circ / 2 + circ / n * (i + 0.5), 0]));
    let deco = null;
    if (v.band !== 'none') {
      const bh = Math.min(6, H * 0.12), items = [];
      const yTop = H / 2 - bh * 0.9, yBot = -H / 2 + bh * 0.9;
      if (v.band === 'stripes') for (const y of [yTop, yBot]) items.push(CrossSection.square([circ + 2, bh * 0.45], true).translate([0, y]));
      else {
        const count = Math.floor(circ / (bh * 2.2));
        for (let i = 0; i < count; i++) for (const y of [yTop, yBot]) {
          const s = v.band === 'hearts' ? fitInto(heart(10), bh, bh) : star(bh * 1.1, 5, 0.45, 0.2);
          items.push(s.translate([-circ / 2 + (i + 0.5) * circ / count, y]));
        }
      }
      deco = CrossSection.union(items);
    }
    const flat = CrossSection.union(deco ? [...flats, deco] : flats);
    const raised = v.style === 'raised';
    const d = raised ? 1 : t + 2;
    let wrap = flat.extrude(d + 0.6).translate([0, 0, raised ? -0.6 : -t - 1]).refineToLength(1.2);
    wrap = wrap.warp(p => {
      const a = p[0] / rm, z = p[1] + H / 2, r = rAt(z) + t + p[2];
      p[0] = Math.cos(a) * r; p[1] = Math.sin(a) * r; p[2] = z;
    });
    const parts = [];
    if (raised) parts.push(part('Texto', v.cText, wrap.subtract(body)));
    else {
      // Calado: los centritos de las letras (a, o, e…) se caen; queda solo la funda
      const bodies = body.subtract(wrap).decompose().sort((x, y) => y.volume() - x.volume());
      body = bodies[0];
    }
    parts.unshift(part('Funda', v.cBody, body));
    return mergeByColor(parts);
  },
};
