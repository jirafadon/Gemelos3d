/**
 * Exhibidor para salón o local: escalones con ranuras para tarjetas de uñas (tips),
 * pestañas, muestras o tarjetas, y el nombre del negocio al frente en otro color.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'exhibidor-salon',
  title: 'Exhibidor para salón',
  description: 'Escalones con ranuras para tips, pestañas o tarjetas, con el nombre del negocio.',
  fileName: v => `exhibidor_${firstLine(v.text, 'salon')}`,
  params: [
    { type: 'group', label: 'Exhibidor' },
    { key: 'width', type: 'number', label: 'Ancho', default: 160, min: 60, max: 260, step: 1, unit: 'mm' },
    { key: 'steps', type: 'number', label: 'Escalones', default: 3, min: 1, max: 6, step: 1, unit: '' },
    { key: 'stepD', type: 'number', label: 'Fondo de cada escalón', default: 22, min: 12, max: 60, step: 1, unit: 'mm' },
    { key: 'stepH', type: 'number', label: 'Alto de cada escalón', default: 16, min: 6, max: 40, step: 1, unit: 'mm' },
    { key: 'slots', type: 'number', label: 'Ranuras por escalón', default: 5, min: 1, max: 20, step: 1, unit: '' },
    { key: 'slotW', type: 'number', label: 'Ancho de cada ranura', default: 18, min: 5, max: 80, step: 0.5, unit: 'mm', hint: 'El ancho de la tarjeta o muestra que va parada.' },
    { key: 'slotT', type: 'number', label: 'Espesor de la ranura', default: 1.6, min: 0.6, max: 6, step: 0.1, unit: 'mm', hint: 'Espesor de la tarjeta + 0,4 mm.' },
    { key: 'slotDepth', type: 'number', label: 'Profundidad de la ranura', default: 8, min: 3, max: 30, step: 0.5, unit: 'mm' },
    { key: 'lean', type: 'number', label: 'Inclinación de las ranuras', default: 10, min: 0, max: 25, step: 1, unit: '°', hint: 'Un poco hacia atrás para que se vea mejor.' },

    { type: 'group', label: 'Nombre del negocio' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'Nails by Ana' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'great-vibes', show: v => !!(v.text || '').trim() },
    { key: 'color', type: 'color', label: 'Exhibidor', default: '#F5F5F5' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#C9A66B', show: v => !!(v.text || '').trim() },
  ],
  async build(v, ctx) {
    const { Manifold } = wasm();
    const W = v.width, n = v.steps;
    const D = n * v.stepD;
    let body = null;
    for (let i = 0; i < n; i++) {
      const h = (i + 1) * v.stepH;
      const blk = slab(roundedRect(W, D - i * v.stepD, 3), h).translate([0, i * v.stepD / 2, 0]);
      body = body ? body.add(blk) : blk;
    }
    const cuts = [];
    for (let i = 0; i < n; i++) {
      const h = (i + 1) * v.stepH, y = -D / 2 + i * v.stepD + v.stepD / 2;
      const pitch = W / v.slots;
      for (let k = 0; k < v.slots; k++) {
        const x = -W / 2 + pitch * (k + 0.5);
        const s = Manifold.cube([Math.min(v.slotW, pitch - 3), v.slotT, v.slotDepth * 2], true).rotate([-v.lean, 0, 0]).translate([x, y, h]);
        cuts.push(s);
      }
    }
    body = body.subtract(Manifold.union(cuts));
    const parts = [part('Exhibidor', v.color, body)];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const txt = fitInto(stackLines([{ font, text: v.text, height: 10 }], 0), W * 0.85, v.stepH * 0.7);
      parts.push(part('Nombre', v.cText, txt.extrude(1).rotate([90, 0, 0]).translate([0, -D / 2, v.stepH / 2])));
    }
    return mergeByColor(parts);
  },
};
