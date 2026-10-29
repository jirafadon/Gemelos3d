/**
 * Sello para goma EVA, plastilina o arcilla: el dibujo o texto espejado en relieve alto
 * sobre una placa, y un mango aparte que encastra atrás. Placa y mango se imprimen
 * sin soportes (la placa con el relieve hacia arriba).
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'sello-eva',
  title: 'Sello para goma EVA / plastilina',
  description: 'Sello con relieve alto y mango aparte, para EVA, plastilina o arcilla.',
  fileName: v => `sello_eva_${v.source === 'text' ? firstLine(v.text) : 'imagen'}`,
  params: [
    { type: 'group', label: 'Dibujo' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'text', options: [{ value: 'text', label: 'Texto' }, { value: 'image', label: 'Imagen' }] },
    { key: 'text', type: 'text', label: 'Texto', default: 'Hecho\ncon amor', multiline: true, show: v => v.source === 'text' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'lobster', show: v => v.source === 'text' },
    ...imageParams({ showIf: v => v.source === 'image' }),

    { type: 'group', label: 'Sello' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'rect', options: [{ value: 'rect', label: 'Rectángulo' }, { value: 'circle', label: 'Círculo' }, { value: 'heart', label: 'Corazón' }] },
    { key: 'size', type: 'number', label: 'Tamaño', default: 60, min: 25, max: 150, step: 1, unit: 'mm' },
    { key: 'relief', type: 'number', label: 'Alto del relieve', default: 3, min: 1, max: 8, step: 0.2, unit: 'mm', hint: 'Para EVA conviene 3 mm o más; para tinta, 1,5 mm.' },
    { key: 'plateT', type: 'number', label: 'Espesor de la placa', default: 4, min: 2.4, max: 10, step: 0.2, unit: 'mm' },
    { key: 'rim', type: 'toggle', label: 'Borde alrededor', default: false },
    { key: 'mirror', type: 'toggle', label: 'Espejar (se lee bien en la marca)', default: true },
    { key: 'tol', type: 'number', label: 'Holgura del mango', default: 0.2, min: 0, max: 0.6, step: 0.05, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Sello', default: '#457B9D' },
    { key: 'color2', type: 'color', label: 'Mango', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const S = v.size;
    const face = v.shape === 'circle' ? circle(S / 2, 128) : v.shape === 'heart' ? heart(S, S * 0.9) : roundedRect(S, S * 0.7, 5);
    let art;
    if (v.source === 'text') {
      const font = await ctx.font(v.font);
      art = stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 1.5);
    } else art = await silhouette(v, ctx, 100);
    const fb = face.bounds();
    const fw = fb.max[0] - fb.min[0], fh = fb.max[1] - fb.min[1];
    const k = v.shape === 'heart' ? 0.6 : v.rim ? 0.8 : 0.88;
    art = fitInto(art, fw * k, fh * k * (v.shape === 'heart' ? 0.75 : 1)).translate([0, v.shape === 'heart' ? fh * 0.05 : 0]);
    if (v.mirror) art = art.mirror([1, 0]);
    let top = art.intersect(face.offset(-1, 'Round', 2, 32));
    if (v.rim) top = top.add(face.subtract(face.offset(-1.6, 'Round', 2, 32)));
    // Placa con encastre cuadrado atrás (abajo al imprimir) para el mango
    const sq = 12;
    let plate = slab(face, v.plateT).add(slab(top, v.relief, v.plateT - 0.01))
      .subtract(Manifold.cube([sq + 2 * v.tol, sq + 2 * v.tol, Math.min(3, v.plateT - 1.2) + 0.01], false).translate([-(sq + 2 * v.tol) / 2, -(sq + 2 * v.tol) / 2, -0.01]));
    // Mango: encastre cuadrado + cuello + ensanche a 45° + perilla (todo sin soportes, encastre abajo)
    const knobR = Math.min(16, S * 0.28), peg = Math.min(3, v.plateT - 1.2) - 0.1, neckR = 6, neckH = 14;
    const handle = Manifold.cylinder(peg, sq / 2 * Math.SQRT2, sq / 2 * Math.SQRT2, 4).rotate([0, 0, 45])
      .add(Manifold.cylinder(neckH, neckR, neckR, 48).translate([0, 0, peg - 0.01]))
      .add(Manifold.cylinder(knobR - neckR, neckR, knobR, 64).translate([0, 0, peg + neckH - 0.02]))
      .add(Manifold.cylinder(6, knobR, knobR - 1, 64).translate([0, 0, peg + neckH + knobR - neckR - 0.03]));
    return mergeByColor([
      part('Sello', v.color, plate),
      part('Mango', v.color2, handle.translate([fw / 2 + knobR + 12, 0, 0])),
    ]);
  },
};
