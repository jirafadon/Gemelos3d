/**
 * Llavero con espejo: un aro con alojamiento para un espejito redondo (se pega o entra
 * a presión) y el nombre atrás. Se imprime con la cara de atrás sobre la cama:
 * el nombre va embutido ahí, espejado para que se lea bien.
 */
import { circle, slab, part, addRing } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart } from '../engine/shapes.js';
import { ringParams, firstLine } from './_common.js';

export default {
  id: 'llavero-espejo',
  title: 'Llavero con espejo',
  description: 'Aro con hueco para un espejito redondo y el nombre atrás.',
  fileName: v => `llavero_espejo_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Espejo' },
    { key: 'mirrorD', type: 'number', label: 'Diámetro del espejo', default: 50, min: 20, max: 90, step: 0.5, unit: 'mm', hint: 'Medí el espejito; se agregan 0,4 mm de holgura.' },
    { key: 'mirrorT', type: 'number', label: 'Espesor del espejo', default: 2, min: 1, max: 5, step: 0.1, unit: 'mm' },
    { key: 'lip', type: 'toggle', label: 'Pestaña para que entre a presión', default: true, hint: 'Un borde un poco más chico arriba que lo sostiene sin pegamento.' },

    { type: 'group', label: 'Llavero' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'heart', label: 'Corazón' }] },
    { key: 'rim', type: 'number', label: 'Ancho del aro', default: 3, min: 2, max: 10, step: 0.5, unit: 'mm' },
    { key: 'back', type: 'number', label: 'Espesor de atrás', default: 1.6, min: 1, max: 4, step: 0.2, unit: 'mm' },
    { key: 'text', type: 'text', label: 'Nombre atrás', default: 'Sofía' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'dancing' },
    { key: 'color', type: 'color', label: 'Llavero', default: '#F72585' },
    { key: 'cText', type: 'color', label: 'Nombre', default: '#F5F5F5' },
    ...ringParams({ def: 'top', options: ['top', 'left', 'right'] }),
  ],
  async build(v, ctx) {
    const D = v.mirrorD + 0.4, R = D / 2 + v.rim;
    const outer = v.shape === 'heart' ? heart(R * 2.35, R * 2.15).translate([0, -R * 0.1]) : circle(R, 128);
    const pocket = circle(D / 2, 128);
    const { shape } = addRing(outer, { side: v.ring, holeD: v.holeD, wall: v.ringWall });
    const H = v.back + v.mirrorT + (v.lip ? 0.6 : 0.2);
    let body = slab(shape, H).subtract(slab(pocket, H, v.back));
    // Pestaña: un anillo apenas más chico en la boca, el espejo entra presionando
    if (v.lip) body = body.add(slab(pocket.subtract(circle(D / 2 - 0.5, 128)), 0.6, H - 0.6));
    const parts = [];
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      const t = slab(fitInto(stackLines([{ font, text: v.text, height: 10 }], 0), D * 0.75, D * 0.35).mirror([1, 0]), 0.6);
      body = body.subtract(t);
      parts.push(part('Nombre', v.cText, t));
    }
    parts.push(part('Llavero', v.color, body));
    return mergeByColor(parts);
  },
};
