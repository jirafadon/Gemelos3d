/**
 * Adornos navideños con nombre: bola calada, bola con moño y gajos, corona, reno,
 * bastón de caramelo, gnomo, galletita de jengibre, arbolito, campana, copo o estrella.
 * Los detalles (moño, bayas, rayas, barba…) van en un segundo color encima,
 * y el nombre en relieve con un contorno que lo une al adorno. Colgante arriba.
 */
import { wasm, circle, roundedRect, outline, part, slab } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { ring, snowflake, star, fitInto } from '../engine/shapes.js';
import { bauble, wreath, reindeer, candyCane, gnome, gingerbread, treeShape, bell } from '../engine/xmas.js';
import { firstLine, textPlaceParams, placeText } from './_common.js';

const KINDS = [
  { value: 'ball', label: 'Bola calada' },
  { value: 'bauble', label: 'Bola con moño' },
  { value: 'wreath', label: 'Corona' },
  { value: 'reindeer', label: 'Reno' },
  { value: 'cane', label: 'Bastón' },
  { value: 'gnome', label: 'Gnomo' },
  { value: 'ginger', label: 'Galletita' },
  { value: 'tree', label: 'Arbolito' },
  { value: 'bell', label: 'Campana' },
  { value: 'flake', label: 'Copo' },
  { value: 'star', label: 'Estrella' },
];

/** Colores clásicos de cada modelo: [adorno, detalles, nombre]. */
const AUTO = {
  ball: ['#F5F5F5', '#D62828', '#D62828'],
  bauble: ['#D62828', '#C9A227', '#F5F5F5'],
  wreath: ['#2D6A4F', '#D62828', '#F5F5F5'],
  reindeer: ['#8B5A2B', '#D62828', '#F5F5F5'],
  cane: ['#F5F5F5', '#D62828', '#2D6A4F'],
  gnome: ['#D62828', '#F5F5F5', '#1E1E1E'],
  ginger: ['#B5651D', '#F5F5F5', '#F5F5F5'],
  tree: ['#2D6A4F', '#FCBF49', '#F5F5F5'],
  bell: ['#C9A227', '#D62828', '#1E1E1E'],
  flake: ['#9AD1F5', '#F5F5F5', '#F5F5F5'],
  star: ['#FCBF49', '#F5F5F5', '#D62828'],
};
const HAS_DECO = new Set(['bauble', 'wreath', 'reindeer', 'cane', 'gnome', 'ginger', 'tree', 'bell']);

export default {
  id: 'adorno-navidad',
  title: 'Adornos navideños',
  description: 'Bolas, corona, reno, bastón, gnomo, galletita, arbolito, campana, copo o estrella con nombre, listos para colgar.',
  fileName: v => `adorno_${v.kind}_${firstLine(v.name, v.line2)}`,
  params: [
    { type: 'group', label: 'Adorno' },
    { key: 'kind', type: 'segment', label: 'Modelo', default: 'ball', options: KINDS },
    { key: 'size', type: 'number', label: 'Tamaño', default: 80, min: 40, max: 160, step: 1, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Ancho del aro', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm', show: v => v.kind === 'ball' || v.kind === 'bauble' },
    { key: 'flakes', type: 'toggle', label: 'Copitos alrededor del aro', default: true, show: v => v.kind === 'ball' },

    { type: 'group', label: 'Nombre' },
    { key: 'name', type: 'text', label: 'Nombre', default: 'Aline' },
    { key: 'line2', type: 'text', label: 'Segunda línea (año, apellido…)', default: '', hint: 'Por ejemplo "2026" o "Familia Pérez".' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico' },
    { key: 'font2', type: 'font', label: 'Tipografía de la segunda línea', default: 'poppins', show: v => !!(v.line2 || '').trim() },
    { key: 'border', type: 'number', label: 'Contorno del nombre', default: 2, min: 0.8, max: 6, step: 0.1, unit: 'mm' },

    ...textPlaceParams(),
    { type: 'group', label: 'Colores' },
    { key: 'colors', type: 'segment', label: 'Colores', default: 'auto', options: [{ value: 'auto', label: 'Los clásicos' }, { value: 'custom', label: 'Elegir' }, { value: 'one', label: 'Uno solo' }] },
    { key: 'cBase', type: 'color', label: 'Adorno', default: '#F5F5F5', show: v => v.colors !== 'auto' },
    { key: 'cDeco', type: 'color', label: 'Detalles', default: '#D62828', show: v => v.colors === 'custom' && HAS_DECO.has(v.kind) },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#D62828', show: v => v.colors === 'custom' },

    { type: 'group', label: 'Espesor' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 3, min: 1.6, max: 8, step: 0.2, unit: 'mm' },
    { key: 'holeD', type: 'number', label: 'Agujero para colgar', default: 4, min: 2, max: 8, step: 0.5, unit: 'mm' },
  ],

  async build(v, ctx) {
    const [font, font2] = await Promise.all([ctx.font(v.font), ctx.font(v.font2 || v.font)]);
    const S = v.size, R = S / 2, t = v.thick;
    // Colores (los viejos guardados con 1/2 siguen andando)
    const mode = v.colors === 1 || v.colors === '1' ? 'one' : v.colors === 2 || v.colors === '2' ? 'custom' : v.colors;
    const [cB, cD, cT] = mode === 'auto' ? (AUTO[v.kind] || AUTO.ball) : mode === 'one' ? [v.cBase, v.cBase, v.cBase] : [v.cBase, v.cDeco || v.cBase, v.cText];

    const lines = [{ font, text: v.name || ' ', height: 10 }];
    if ((v.line2 || '').trim()) lines.push({ font: font2, text: v.line2, height: 5.5 });
    const label = stackLines(lines, 1.6);

    let body, deco = null, nameShape;

    if (v.kind === 'ball') {
      body = ring(R, v.rim);
      if (v.flakes) for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 360 + 22.5;
        if (Math.abs(((a + 360) % 360) - 90) < 30) continue; // deja libre arriba para el colgante
        body = body.add(snowflake(v.rim * 3.4).translate([R - v.rim / 2, 0]).rotate(a));
      }
      // El nombre cruza el aro de lado a lado; su contorno lo une (también los puntos de la i)
      nameShape = placeText(fitInto(label, (R - v.rim * 0.4) * 2, R * 0.9), v, body);
    } else if (v.kind === 'flake' || v.kind === 'star') {
      body = v.kind === 'flake' ? snowflake(S) : star(S, 5, 0.5, 1.2);
      const area = v.kind === 'flake' ? [R * 1.3, R * 0.45] : [R * 0.9, R * 0.36];
      nameShape = placeText(fitInto(label, area[0], area[1]), v, body);
    } else {
      const f = { bauble: () => bauble(S, v.rim), wreath: () => wreath(S), reindeer: () => reindeer(S), cane: () => candyCane(S),
        gnome: () => gnome(S), ginger: () => gingerbread(S), tree: () => treeShape(S), bell: () => bell(S) }[v.kind] || (() => bauble(S, v.rim));
      const x = f();
      body = x.shape.add(x.deco || circle(0.01));
      deco = x.deco;
      const [aw, ah, ay] = x.area;
      let txt = fitInto(label, aw, ah);
      if (x.vertical) txt = fitInto(label, ah, aw).rotate(90);
      nameShape = placeText(txt.translate([x.areaX || 0, ay]), v, body);
    }

    const shell = body;
    body = body.add(outline(nameShape, v.border));
    // Si el nombre quedó flotando adentro de un aro, una cinta lo une de lado a lado
    if (body.decompose().length > 1) {
      const nb = nameShape.bounds(), cy = (nb.min[1] + nb.max[1]) / 2;
      const band = roundedRect(S * 1.4, Math.max(2.4, (v.rim || 4) * 0.8), 1).translate([0, cy]);
      body = body.add(band.intersect(wasm().CrossSection.hull([shell])));
    }

    // Colgante: anillito arriba
    const hr = v.holeD / 2, hangR = hr + 2.2;
    // Se apoya en lo más alto del centro (en el reno, entre las astas)
    const mid = body.intersect(roundedRect(2, S * 4, 0)), top = (mid.isEmpty() ? body : mid).bounds().max[1];
    const hang = circle(hangR).translate([0, top + hr]).subtract(circle(hr).translate([0, top + hr]));
    body = body.add(hang);

    const parts = [part('Adorno', cB, slab(body, t))];
    if (deco && !deco.isEmpty()) {
      // Los detalles van encima, sin pisar el nombre
      const d = deco.subtract(outline(nameShape, v.border));
      if (!d.isEmpty()) parts.push(part('Detalles', cD, slab(d, 0.8, t)));
    }
    parts.push(part('Nombre', cT, slab(nameShape, 1, t)));
    return mergeByColor(parts);
  },
};
