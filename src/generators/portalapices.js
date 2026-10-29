/**
 * Portalápices con el nombre al frente.
 * Redondo: el texto se curva siguiendo la pared. Hexagonal / cuadrado: va sobre una cara plana.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'portalapices',
  title: 'Portalápices con nombre',
  description: 'Vaso redondo, hexagonal o cuadrado con el nombre en relieve al frente.',
  fileName: v => `portalapices_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Bauti' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'baloo' },
    { key: 'textH', type: 'number', label: 'Alto del texto', default: 18, min: 6, max: 60, step: 0.5, unit: 'mm' },
    { key: 'relief', type: 'number', label: 'Relieve', default: 1.2, min: 0.4, max: 4, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Vaso' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'hex', label: 'Hexagonal' }, { value: 'square', label: 'Cuadrado' }] },
    { key: 'diam', type: 'number', label: 'Ancho', default: 75, min: 40, max: 160, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 100, min: 40, max: 220, step: 1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 1, max: 5, step: 0.2, unit: 'mm' },
    { key: 'floor', type: 'number', label: 'Piso', default: 2.4, min: 1, max: 6, step: 0.2, unit: 'mm' },
    { key: 'cells', type: 'segment', label: 'Divisiones adentro', default: 1, options: [{ value: 1, label: 'Ninguna' }, { value: 2, label: 'En 2' }, { value: 4, label: 'En 4' }] },

    { type: 'group', label: 'Colores' },
    { key: 'cBody', type: 'color', label: 'Vaso', default: '#1D4ED8' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5' },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const R = v.diam / 2, H = v.height, t = v.wall;
    const outer = v.shape === 'round' ? circle(R, 128) : v.shape === 'hex' ? circle(R, 6).rotate(30) : roundedRect(v.diam, v.diam, 4);
    const inner = v.shape === 'round' ? circle(R - t, 128) : v.shape === 'hex' ? circle(R - t / Math.cos(Math.PI / 6), 6).rotate(30) : roundedRect(v.diam - 2 * t, v.diam - 2 * t, Math.max(0.5, 4 - t));
    let body = slab(outer, H).subtract(slab(inner, H, v.floor));
    if (v.cells > 1) {
      const walls = [CrossSection.square([1.6, v.diam], true)];
      if (v.cells === 4) walls.push(CrossSection.square([v.diam, 1.6], true));
      body = body.add(slab(CrossSection.union(walls).intersect(inner.offset(0.2)), H * 0.75, v.floor));
    }

    // Cara frontal (hacia -Y): distancia del centro a esa cara y ancho útil
    const apothem = v.shape === 'hex' ? R * Math.cos(Math.PI / 6) : R;
    const faceW = v.shape === 'hex' ? R * 0.9 : v.shape === 'square' ? v.diam - 8 : Math.PI * R * 0.55;
    const font = await ctx.font(v.font);
    let txt = stackLines([{ font, text: v.text || ' ', height: v.textH }], 0);
    const tb = txt.bounds();
    if (tb.max[0] - tb.min[0] > faceW) txt = fitInto(txt, faceW, v.textH);
    const zMid = Math.min(H * 0.55, H - v.textH);
    // El texto se arma "acostado" (x = ancho, y = alto) y se para sobre la cara frontal
    let solid = txt.extrude(v.relief + 0.6).translate([0, 0, -0.6]).rotate([90, 0, 0]).translate([0, -apothem, zMid]);
    if (v.shape === 'round') {
      // Curva el texto alrededor del cilindro: x → ángulo, profundidad → radio
      solid = solid.refineToLength(1.5).warp(p => {
        const ang = p[0] / R, r = -p[1];
        p[0] = r * Math.sin(ang); p[1] = -r * Math.cos(ang);
      });
    }
    solid = solid.subtract(slab(outer, H + 2, -1));
    return mergeByColor([part('Vaso', v.cBody, body), part('Nombre', v.cText, solid)]);
  },
};
