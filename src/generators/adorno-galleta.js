/**
 * Adorno tipo galleta de jengibre con nombre: las letras en color galletita, redondeadas,
 * con el glaseado (una línea blanca que sigue las letras) en relieve, gorrito navideño
 * opcional sobre la primera letra y argolla para colgar.
 */
import { wasm, circle, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { firstLine } from './_common.js';

export default {
  id: 'adorno-galleta',
  title: 'Adorno tipo galleta',
  description: 'Tu nombre como galletita de jengibre: letras redondeadas, glaseado blanco que sigue las letras y gorrito navideño.',
  fileName: v => `galleta_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Nombre' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Ava' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'lobster', hint: 'Las cursivas unidas quedan como una sola galletita.' },
    { key: 'width', type: 'number', label: 'Ancho', default: 90, min: 40, max: 200, step: 1, unit: 'mm' },
    { key: 'puff', type: 'number', label: 'Gordura de la galleta', default: 3.2, min: 1, max: 8, step: 0.1, unit: 'mm' },
    { key: 'icing', type: 'number', label: 'Línea de glaseado', default: 1.1, min: 0.6, max: 2.5, step: 0.05, unit: 'mm' },
    { key: 'icingIn', type: 'number', label: 'Glaseado hacia adentro', default: 1.4, min: 0.6, max: 4, step: 0.1, unit: 'mm', hint: 'Qué tan lejos del borde va la línea blanca.' },
    { key: 'hat', type: 'toggle', label: 'Gorrito navideño en la primera letra', default: true },
    { key: 'ring', type: 'toggle', label: 'Argolla para colgar', default: true },

    { type: 'group', label: 'Espesor y colores' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 4, min: 2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'cCookie', type: 'color', label: 'Galleta', default: '#B5651D' },
    { key: 'cIcing', type: 'color', label: 'Glaseado', default: '#F5F5F5' },
    { key: 'cHat', type: 'color', label: 'Gorrito', default: '#D62828', show: v => v.hat },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    const font = await ctx.font(v.font);
    let letters = stackLines([{ font, text: v.text || ' ', height: 20 }]);
    const b0 = letters.bounds();
    letters = letters.scale(v.width / Math.max(1, b0.max[0] - b0.min[0]));
    // Galleta: las letras "infladas" y redondeadas, sin agujeros
    const cookie = fillHoles(outline(letters, v.puff).offset(-0.6, 'Round', 2, 24).offset(0.6, 'Round', 2, 24));
    // Glaseado: una línea que sigue el borde, un poco hacia adentro
    const inner = cookie.offset(-v.icingIn, 'Round', 2, 24);
    const icing = inner.subtract(inner.offset(-v.icing, 'Round', 2, 24));
    let body = cookie;
    const parts = [];
    let hat = null;
    if (v.hat) {
      // Gorrito sobre la primera letra: triángulo inclinado con pompón y ala blanca
      const first = letters.decompose().sort((a, b) => a.bounds().min[0] - b.bounds().min[0])[0];
      const lb = letters.bounds(), fb = (first || letters).bounds();
      const w = Math.max(12, Math.min((fb.max[0] - fb.min[0]) * 1.1, (lb.max[0] - lb.min[0]) * 0.3));
      const x = fb.min[0] + w * 0.55;
      // Se apoya en lo alto de la letra en esa franja
      const col = letters.intersect(CrossSection.square([w * 0.6, (lb.max[1] - lb.min[1]) * 4], true).translate([x, 0]));
      const y = (col.isEmpty() ? lb : col.bounds()).max[1] + v.puff * 0.2;
      const cone = new CrossSection([[[x - w / 2, y], [x + w / 2, y], [x + w * 0.55, y + w * 0.75]]], 'Positive');
      const brim = CrossSection.square([w * 1.05, w * 0.16], true).offset(w * 0.06, 'Round', 2, 16).translate([x, y]);
      const pom = circle(w * 0.15, 32).translate([x + w * 0.55, y + w * 0.75]);
      hat = { red: cone.subtract(brim).subtract(pom), white: brim.add(pom) };
      body = body.add(outline(cone.add(brim).add(pom), 1.2));
    }
    if (v.ring) {
      // Arriba de la primera letra (o del gorrito): se apoya en lo más alto de esa franja
      const b = body.bounds(), x = b.min[0] + (b.max[0] - b.min[0]) * 0.18;
      const strip = body.intersect(CrossSection.square([4, (b.max[1] - b.min[1]) * 4], true).translate([x, 0]));
      const at = [x, (strip.isEmpty() ? b : strip.bounds()).max[1] + 2.2 - 0.6];
      body = body.add(circle(4.6, 40).translate(at)).subtract(circle(2.2, 32).translate(at));
    }
    parts.push(part('Galleta', v.cCookie, slab(body, v.thick)));
    const top = v.thick;
    parts.push(part('Glaseado', v.cIcing, slab(icing, 0.8, top)));
    if (hat) {
      parts.push(part('Gorrito', v.cHat, slab(hat.red.subtract(icing), 1, top)));
      parts.push(part('Glaseado', v.cIcing, slab(hat.white.subtract(icing), 1.2, top)));
    }
    return mergeByColor(parts);
  },
};
