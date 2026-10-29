/**
 * Vasos, floreros y pantallas de lámpara en espiral.
 * "Modo vaso": sale macizo para imprimir en modo espiral (vase mode) del laminador.
 * "Con paredes": hueco, con piso; sirve como maceta, bowl o portalápices.
 */
import { circle, slab, part, polygonShape } from '../engine/geom.js';
import { star } from '../engine/shapes.js';

/** Contorno de la base según el estilo elegido (diámetro d). */
export function vaseSection(style, d, n, depth) {
  const r = d / 2;
  if (style === 'round') return circle(r, 128);
  if (style === 'polygon') return circle(r, n).offset(-Math.min(3, r * 0.08), 'Round', 2, 24).offset(Math.min(3, r * 0.08), 'Round', 2, 24);
  if (style === 'star') return star(d, n, 1 - depth, Math.min(2, r * 0.05));
  // Flor: borde ondulado
  const pts = [];
  for (let i = 0; i < 360; i++) {
    const a = i / 360 * Math.PI * 2;
    const k = 1 - depth / 2 + (depth / 2) * Math.cos(n * a);
    pts.push([r * k * Math.cos(a), r * k * Math.sin(a)]);
  }
  return polygonShape(pts);
}

export default {
  id: 'vasos-espiral',
  title: 'Vasos y lámparas en espiral',
  description: 'Floreros, macetas y pantallas con giro, ondas y forma de estrella o flor.',
  fileName: v => `vaso_${v.style}_${v.height}mm`,
  params: [
    { type: 'group', label: 'Forma' },
    { key: 'style', type: 'segment', label: 'Contorno', default: 'flower', options: [{ value: 'flower', label: 'Flor' }, { value: 'star', label: 'Estrella' }, { value: 'polygon', label: 'Polígono' }, { value: 'round', label: 'Redondo' }] },
    { key: 'lobes', type: 'number', label: 'Puntas / lados / ondas', default: 8, min: 3, max: 24, step: 1, unit: '', show: v => v.style !== 'round' },
    { key: 'depth', type: 'number', label: 'Profundidad de las ondas', default: 0.18, min: 0.04, max: 0.5, step: 0.01, unit: '×', show: v => v.style === 'flower' || v.style === 'star' },
    { key: 'diam', type: 'number', label: 'Diámetro de la base', default: 80, min: 20, max: 250, step: 1, unit: 'mm' },
    { key: 'topScale', type: 'number', label: 'Boca (respecto de la base)', default: 1.25, min: 0.3, max: 2.5, step: 0.05, unit: '×' },
    { key: 'height', type: 'number', label: 'Alto', default: 140, min: 20, max: 270, step: 1, unit: 'mm' },
    { key: 'twist', type: 'number', label: 'Giro total', default: 90, min: -360, max: 360, step: 5, unit: '°' },

    { type: 'group', label: 'Impresión' },
    { key: 'mode', type: 'segment', label: 'Cómo se imprime', default: 'vase', options: [{ value: 'vase', label: 'Modo vaso (espiral)' }, { value: 'walls', label: 'Con paredes' }], hint: 'Modo vaso: activá "espiral / vase mode" en el laminador; sale con una sola pared.' },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 0.8, max: 6, step: 0.2, unit: 'mm', show: v => v.mode === 'walls' },
    { key: 'floor', type: 'number', label: 'Piso', default: 2, min: 0.8, max: 8, step: 0.2, unit: 'mm', show: v => v.mode === 'walls' },
    { key: 'hole', type: 'number', label: 'Agujero en el piso (lámpara / drenaje)', default: 0, min: 0, max: 60, step: 1, unit: 'mm', show: v => v.mode === 'walls' },
    { key: 'color', type: 'color', label: 'Color', default: '#B45309' },
  ],

  build(v) {
    const sec = vaseSection(v.style, v.diam, v.lobes, v.depth);
    const div = Math.max(8, Math.round(v.height / 1.5));
    let solid = sec.extrude(v.height, div, v.twist, [v.topScale, v.topScale]);
    if (v.mode === 'walls') {
      // Interior: la misma forma achicada por la pared, con el mismo giro y la misma boca
      const inner = sec.offset(-v.wall, 'Round', 2, 24);
      const h = v.height - v.floor;
      const k = v.floor / v.height;
      // A la altura del piso el contorno ya giró y creció un poco: se arranca desde ahí
      const startScale = 1 + (v.topScale - 1) * k;
      const innerSolid = inner.scale(startScale).rotate(v.twist * k)
        .extrude(h + 1, div, v.twist * (1 - k) * (h + 1) / h, [v.topScale / startScale, v.topScale / startScale])
        .translate([0, 0, v.floor]);
      solid = solid.subtract(innerSolid);
      if (v.hole > 0) solid = solid.subtract(slab(circle(v.hole / 2, 48), v.floor + 2, -1));
    }
    return [part('Vaso', v.color, solid)];
  },
};
