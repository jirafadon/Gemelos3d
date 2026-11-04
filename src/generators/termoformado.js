/**
 * Moldes para termoformado: un par macho y hembra para hacer adornos huecos
 * con plástico o malla calentada (corazón, flor, globo, bola, cuadrado o tu forma),
 * con un texto o inicial que queda marcado. El macho lleva una "cúpula" escalonada fina
 * y la hembra el hueco que la copia, con lugar para el espesor de la lámina.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { SHAPES, fitInto, heart, flower } from '../engine/shapes.js';
import { firstLine, imageParams, silhouette } from './_common.js';

const FORMS = {
  heart: { label: 'Corazón', make: s => fitInto(heart(100), s, s) },
  ball: { label: 'Bola', make: s => circle(s / 2, 128) },
  flower: { label: 'Flor', make: s => fitInto(flower(100, 100, 5), s, s) },
  balloon: { label: 'Globo', make: s => (SHAPES.balloonShape ? fitInto(SHAPES.balloonShape.make(100, 120), s * 0.82, s) : circle(s / 2, 96)) },
  square: { label: 'Cuadrado', make: s => roundedRect(s * 0.92, s * 0.92, s * 0.18) },
  star: { label: 'Estrella', make: s => SHAPES.star.make(s, s) },
};

export default {
  id: 'termoformado',
  title: 'Moldes para termoformado',
  description: 'Par de moldes macho y hembra para adornos huecos de plástico o malla, con texto o inicial marcados.',
  fileName: v => `termoformado_${v.form}_${firstLine(v.text, 'liso')}`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'form', type: 'segment', label: 'Forma', default: 'heart', options: [...Object.entries(FORMS).map(([value, f]) => ({ value, label: f.label })), { value: 'image', label: 'Mi forma' }] },
    ...imageParams({ label: 'Silueta', showIf: v => v.form === 'image' }).filter(p => ['image', 'removeBg', 'threshold', 'invert', 'smooth'].includes(p.key)),
    { key: 'size', type: 'number', label: 'Tamaño del adorno', default: 70, min: 30, max: 160, step: 1, unit: 'mm' },
    { key: 'dome', type: 'number', label: 'Altura de la cúpula', default: 12, min: 3, max: 40, step: 0.5, unit: 'mm', hint: 'Medio adorno: dos mitades pegadas hacen el adorno entero.' },
    { key: 'profile', type: 'segment', label: 'Perfil', default: 'round', options: [{ value: 'round', label: 'Redondeado' }, { value: 'pillow', label: 'Almohadón' }, { value: 'flat', label: 'Plano con borde' }] },
    { key: 'neck', type: 'toggle', label: 'Cuellito para colgar', default: true },

    { type: 'group', label: 'Texto o inicial' },
    { key: 'text', type: 'text', label: 'Texto', default: 'M' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'pacifico', show: v => !!(v.text || '').trim() },
    { key: 'textSize', type: 'number', label: 'Tamaño del texto', default: 55, min: 15, max: 90, step: 1, unit: '%', show: v => !!(v.text || '').trim() },
    { key: 'emboss', type: 'number', label: 'Relieve del texto', default: 1.2, min: 0.4, max: 3, step: 0.1, unit: 'mm', show: v => !!(v.text || '').trim() },

    { type: 'group', label: 'Moldes' },
    { key: 'sheet', type: 'number', label: 'Espesor de la lámina', default: 0.8, min: 0.2, max: 3, step: 0.1, unit: 'mm', hint: 'Lo que ocupa el plástico o la malla entre macho y hembra.' },
    { key: 'flange', type: 'number', label: 'Borde alrededor', default: 12, min: 6, max: 30, step: 1, unit: 'mm' },
    { key: 'baseT', type: 'number', label: 'Espesor de la base', default: 4, min: 2, max: 10, step: 0.5, unit: 'mm' },
    { key: 'vents', type: 'toggle', label: 'Agujeritos de aire (para vacío)', default: true },
    { key: 'cMale', type: 'color', label: 'Macho', default: '#2A9D8F' },
    { key: 'cFemale', type: 'color', label: 'Hembra', default: '#E76F51' },
  ],

  async build(v, ctx) {
    const { Manifold, CrossSection } = wasm();
    let shape = v.form === 'image' ? fitInto(await silhouette(v, ctx, 100, { fill: true }), v.size, v.size) : FORMS[v.form].make(v.size);
    shape = shape.translate([0, 0]);
    const sb = shape.bounds();
    if (v.neck) {
      const nw = Math.max(8, v.size * 0.14);
      shape = shape.add(roundedRect(nw, nw * 1.2, nw * 0.3).translate([0, sb.max[1] + nw * 0.2]));
    }
    // Radio libre de la forma (lo más adentro que se puede ir)
    let lo = 0, hi = v.size; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (shape.offset(-m, 'Round', 2, 12).isEmpty()) hi = m; else lo = m; }
    const R = lo;
    // Cúpula escalonada: cada capa es la forma achicada según el perfil
    const step = 0.35;
    const levels = Math.max(4, Math.ceil(v.dome / step));
    const inset = h => {
      const u = h / v.dome; // 0 abajo, 1 arriba
      if (v.profile === 'flat') return u < 0.15 ? R * 0.05 * (u / 0.15) : R * 0.05 + R * 0.08 * (u - 0.15);
      if (v.profile === 'pillow') return R * (1 - Math.pow(1 - u * u, 0.5)) * 0.85 + R * 0.04 * u;
      return R * (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 0.96; // redondeado (cuarto de elipse)
    };
    const domeOf = (grow, z0) => {
      const layers = [];
      for (let i = 0; i < levels; i++) {
        const h0 = (i / levels) * v.dome, h1 = ((i + 1) / levels) * v.dome;
        const cs = shape.offset(grow - inset(h1), 'Round', 2, 24);
        if (cs.isEmpty()) break;
        layers.push(slab(cs, h1 - h0 + 0.001, z0 + h0));
      }
      return Manifold.union(layers);
    };
    const plate = roundedRect(sb.max[0] - sb.min[0] + 2 * v.flange, shape.bounds().max[1] - sb.min[1] + 2 * v.flange, 6)
      .translate([(sb.min[0] + sb.max[0]) / 2, (sb.min[1] + shape.bounds().max[1]) / 2]);

    // Macho: base + cúpula + texto en relieve arriba
    let male = slab(plate, v.baseT).add(domeOf(0, v.baseT));
    let txt = null, draped = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      txt = fitInto(stackLines([{ font, text: v.text, height: 10 }]), v.size * v.textSize / 100, v.size * v.textSize / 100 * 0.8).intersect(shape.offset(-1, 'Round', 2, 12));
      // El texto "se apoya" sobre la cúpula: cada pedacito va a la altura del escalón que tiene debajo
      let prev = null;
      for (let i = levels - 1; i >= 0; i--) {
        const h1 = ((i + 1) / levels) * v.dome;
        const cs = shape.offset(-inset(h1), 'Round', 2, 24);
        if (cs.isEmpty()) continue;
        const ringCs = prev ? cs.subtract(prev) : cs;
        const piece = txt.intersect(ringCs);
        if (!piece.isEmpty()) draped.push({ cs: piece, z: h1 });
        prev = cs;
      }
      if (draped.length) male = male.add(Manifold.union(draped.map(d => slab(d.cs, v.emboss + 0.01, v.baseT + d.z - 0.005))));
    }
    // Hembra: bloque con el hueco que copia la cúpula más el espesor de la lámina
    const fH = v.dome + v.emboss + v.baseT + v.sheet + 1;
    let female = slab(plate, fH);
    const cavity = domeOf(v.sheet, -0.01).add(slab(shape.offset(v.sheet, 'Round', 2, 24), 0.02, -0.02));
    female = female.subtract(cavity);
    if (draped.length) female = female.subtract(Manifold.union(draped.map(d => slab(d.cs.offset(v.sheet, 'Round', 2, 12), v.emboss + v.sheet + 0.02, d.z - 0.01))));
    if (v.vents) {
      // Agujeritos de 1,2 mm que atraviesan el macho para que salga el aire
      const holes = [];
      const ring = shape.offset(-Math.max(1.5, R * 0.1), 'Round', 2, 12);
      for (const poly of ring.toPolygons()) for (let i = 0; i < poly.length; i += Math.max(1, Math.floor(poly.length / 10))) holes.push(Manifold.cylinder(v.baseT + v.dome + 4, 0.6, 0.6, 12).translate([poly[i][0], poly[i][1], -1]));
      if (holes.length) male = male.subtract(Manifold.union(holes));
    }
    // La hembra se imprime boca abajo (el hueco hacia arriba) al lado del macho
    const pb = plate.bounds(), gap = pb.max[0] - pb.min[0] + 10;
    female = female.mirror([0, 0, 1]).translate([gap, 0, fH]);
    return mergeByColor([part('Macho', v.cMale, male), part('Hembra', v.cFemale, female)]);
  },
};
