/**
 * Caja de luz con tu @usuario: frente oscuro con el texto en color claro y fino
 * (la luz pasa solo por las letras), caja con lugar para una tira LED y salida de cable.
 * Las letras atraviesan el frente, así que se imprime en cualquier cara; ideal para la U1 con dos colores.
 */
import { roundedRect, circle, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto, heart, star } from '../engine/shapes.js';
import { firstLine } from './_common.js';

export default {
  id: 'lampara-social',
  title: 'Caja de luz @usuario',
  description: 'Letrero de luz: tu @usuario se ilumina con una tira LED adentro.',
  fileName: v => `luz_${firstLine(v.text).replace(/^@/, '')}`,
  params: [
    { type: 'group', label: 'Texto' },
    { key: 'text', type: 'text', label: 'Texto', default: '@3dgemelos', multiline: true },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'righteous' },
    { key: 'icon', type: 'segment', label: 'Ícono', default: 'heart', options: [{ value: 'none', label: 'Ninguno' }, { value: 'heart', label: 'Corazón' }, { value: 'star', label: 'Estrella' }] },

    { type: 'group', label: 'Caja' },
    { key: 'width', type: 'number', label: 'Ancho', default: 200, min: 80, max: 260, step: 1, unit: 'mm' },
    { key: 'height', type: 'number', label: 'Alto', default: 70, min: 40, max: 200, step: 1, unit: 'mm' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 30, min: 15, max: 60, step: 1, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 8, min: 0, max: 30, step: 0.5, unit: 'mm' },
    { key: 'front', type: 'number', label: 'Espesor del frente', default: 1.2, min: 0.8, max: 3, step: 0.2, unit: 'mm' },
    { key: 'cableD', type: 'number', label: 'Agujero para el cable', default: 6, min: 3, max: 14, step: 0.5, unit: 'mm' },
    { key: 'tol', type: 'number', label: 'Holgura del frente', default: 0.3, min: 0, max: 0.8, step: 0.05, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cFront', type: 'color', label: 'Frente', default: '#1E1E1E' },
    { key: 'cText', type: 'color', label: 'Texto (traslúcido)', default: '#F5F5F5' },
    { key: 'cBox', type: 'color', label: 'Caja', default: '#1E1E1E' },
  ],
  async build(v, ctx) {
    const W = v.width, H = v.height, wall = 2;
    const outer = roundedRect(W, H, v.radius), inner = roundedRect(W - 2 * wall, H - 2 * wall, Math.max(0.5, v.radius - wall));
    // Caja: fondo + paredes, con salida de cable atrás y un escalón donde apoya el frente
    let box = slab(outer, v.depth).subtract(slab(inner, v.depth, 2)).subtract(slab(roundedRect(W - 2 * wall + 1.4, H - 2 * wall + 1.4, Math.max(0.5, v.radius - wall + 0.7)), v.front + 0.01, v.depth - v.front));
    box = box.subtract(slab(circle(v.cableD / 2, 32).translate([W / 2 - 15, -H / 2 + 12]), 4, -1));
    // Frente: placa que entra en el escalón; el texto la atraviesa en otro color
    const font = await ctx.font(v.font);
    let art = stackLines(String(v.text || ' ').split('\n').map(t => ({ font, text: t, height: 10 })), 2);
    if (v.icon !== 'none') {
      const ab = art.bounds(), ih = ab.max[1] - ab.min[1];
      const ic = v.icon === 'heart' ? heart(ih, ih * 0.9) : star(ih * 1.1);
      art = art.translate([ih * 0.7, 0]).add(ic.translate([ab.min[0] - ih * 0.2, (ab.min[1] + ab.max[1]) / 2]));
    }
    art = fitInto(art, W * 0.82, H * 0.62); // las letras atraviesan el frente: se leen bien de los dos lados
    const panel = roundedRect(W - 2 * wall + 1.4 - 2 * v.tol, H - 2 * wall + 1.4 - 2 * v.tol, Math.max(0.5, v.radius - wall + 0.7 - v.tol));
    const textSolid = slab(art.intersect(panel.offset(-2, 'Round', 2, 16)), v.front);
    const frontSolid = slab(panel, v.front).subtract(textSolid);
    const off = [0, H + 12, 0];
    return mergeByColor([
      part('Caja', v.cBox, box),
      part('Frente', v.cFront, frontSolid.translate(off)),
      part('Texto', v.cText, textSolid.translate(off)),
    ]);
  },
};
