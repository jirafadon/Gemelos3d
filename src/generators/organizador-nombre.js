/**
 * Organizador con forma de nombre: las letras son vasitos huecos (lapicero) unidos por una base.
 * Se imprime parado; cada letra es un compartimento.
 */
import { wasm, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { firstLine } from './_common.js';

export default {
  id: 'organizador-nombre',
  title: 'Organizador con tu nombre',
  description: 'Lapicero u organizador con la forma del nombre: cada letra es un compartimento, sobre una base de otro color.',
  fileName: v => `organizador_${firstLine(v.text)}`,
  params: [
    { type: 'group', label: 'Nombre' },
    { key: 'text', type: 'text', label: 'Nombre', default: 'MILO' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'titan', hint: 'Las letras gruesas (redondas o negritas) dejan compartimentos más útiles.' },
    { key: 'width', type: 'number', label: 'Largo total', default: 160, min: 60, max: 260, step: 1, unit: 'mm' },
    { key: 'spacing', type: 'number', label: 'Juntar letras', default: -0.04, min: -0.15, max: 0.1, step: 0.01, unit: 'em', hint: 'Negativo: las letras se tocan y quedan unidas.' },

    { type: 'group', label: 'Organizador' },
    { key: 'height', type: 'number', label: 'Alto', default: 70, min: 20, max: 160, step: 1, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.6, min: 0.8, max: 4, step: 0.1, unit: 'mm' },
    { key: 'grow', type: 'number', label: 'Engordar letras', default: 2, min: 0, max: 8, step: 0.5, unit: 'mm', hint: 'Hace las letras más anchas para que entren lápices.' },
    { key: 'baseH', type: 'number', label: 'Base', default: 4, min: 2, max: 12, step: 0.5, unit: 'mm' },
    { key: 'baseOut', type: 'number', label: 'Borde de la base', default: 4, min: 0, max: 15, step: 0.5, unit: 'mm' },

    { type: 'group', label: 'Colores' },
    { key: 'cLetters', type: 'color', label: 'Letras', default: '#E76F51' },
    { key: 'cBase', type: 'color', label: 'Base', default: '#F5F5F5' },
  ],
  async build(v, ctx) {
    const font = await ctx.font(v.font);
    let letters = stackLines([{ font, text: v.text || ' ', height: 20, spacing: v.spacing }]);
    const b = letters.bounds();
    letters = letters.scale(v.width / Math.max(1, b.max[0] - b.min[0]));
    if (v.grow > 0) letters = letters.offset(v.grow, 'Round', 2, 24);
    const solid2d = fillHoles(letters);
    const inner = solid2d.offset(-v.wall, 'Round', 2, 24);
    const H = v.height;
    const cups = slab(solid2d, H, v.baseH).subtract(slab(inner, H + 1, v.baseH + 1.2));
    const base = slab(outline(solid2d, v.baseOut), v.baseH);
    return mergeByColor([part('Base', v.cBase, base), part('Letras', v.cLetters, cups)]);
  },
};
