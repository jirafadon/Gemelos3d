/**
 * Caja a medida con divisiones y tapa a presión.
 * La tapa se imprime con la cara de arriba sobre la cama: el texto va
 * embutido en esa cara (multicolor en las primeras capas) y espejado para que se lea bien.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';

export default {
  id: 'cajas',
  title: 'Caja con divisiones y tapa',
  description: 'Caja a medida con compartimentos y tapa a presión, con nombre en la tapa.',
  fileName: v => `caja_${v.W}x${v.D}x${v.H}`,
  params: [
    { type: 'group', label: 'Medidas (por fuera)' },
    { key: 'W', type: 'number', label: 'Ancho', default: 90, min: 20, max: 260, step: 1, unit: 'mm' },
    { key: 'D', type: 'number', label: 'Profundidad', default: 60, min: 20, max: 260, step: 1, unit: 'mm' },
    { key: 'H', type: 'number', label: 'Alto (sin tapa)', default: 35, min: 8, max: 200, step: 1, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Redondeo de esquinas', default: 5, min: 0, max: 30, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Pared', default: 1.6, min: 0.8, max: 5, step: 0.1, unit: 'mm' },
    { key: 'floor', type: 'number', label: 'Piso', default: 1.6, min: 0.8, max: 5, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Divisiones' },
    { key: 'nx', type: 'number', label: 'Compartimentos a lo ancho', default: 3, min: 1, max: 10, step: 1, unit: '' },
    { key: 'ny', type: 'number', label: 'Compartimentos a lo profundo', default: 1, min: 1, max: 10, step: 1, unit: '' },
    { key: 'divT', type: 'number', label: 'Espesor de las divisiones', default: 1.2, min: 0.6, max: 4, step: 0.1, unit: 'mm', show: v => v.nx > 1 || v.ny > 1 },
    { key: 'divLow', type: 'number', label: 'Divisiones más bajas que el borde', default: 2, min: 0, max: 30, step: 0.5, unit: 'mm', show: v => v.nx > 1 || v.ny > 1 },

    { type: 'group', label: 'Tapa' },
    { key: 'lid', type: 'segment', label: 'Tapa', default: 'press', options: [{ value: 'press', label: 'A presión' }, { value: 'none', label: 'Sin tapa' }] },
    { key: 'lidT', type: 'number', label: 'Espesor de la tapa', default: 2, min: 1.2, max: 5, step: 0.2, unit: 'mm', show: v => v.lid !== 'none' },
    { key: 'lip', type: 'number', label: 'Alto del encastre', default: 4, min: 2, max: 12, step: 0.5, unit: 'mm', show: v => v.lid !== 'none' },
    { key: 'tol', type: 'number', label: 'Holgura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm', show: v => v.lid !== 'none', hint: 'Subila si la tapa entra muy justa.' },
    { key: 'text', type: 'text', label: 'Texto en la tapa (opcional)', default: 'Botones', show: v => v.lid !== 'none' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'fredoka', show: v => v.lid !== 'none' && !!(v.text || '').trim() },

    { type: 'group', label: 'Colores' },
    { key: 'cBox', type: 'color', label: 'Caja', default: '#4D7C0F' },
    { key: 'cLid', type: 'color', label: 'Tapa', default: '#F5F5F5', show: v => v.lid !== 'none' },
    { key: 'cText', type: 'color', label: 'Texto', default: '#4D7C0F', show: v => v.lid !== 'none' && !!(v.text || '').trim() },
  ],

  async build(v, ctx) {
    const { CrossSection } = wasm();
    const { W, D, H, wall: t } = v;
    const r = Math.min(v.radius, W / 2 - 0.5, D / 2 - 0.5);
    const outer = roundedRect(W, D, r);
    const inner = roundedRect(W - 2 * t, D - 2 * t, Math.max(0, r - t));
    let box = slab(outer, H).subtract(slab(inner, H, v.floor));

    // Divisiones (paredes internas que se cruzan)
    const iw = W - 2 * t, id = D - 2 * t, divH = Math.max(1, H - v.floor - v.divLow);
    const walls = [];
    for (let i = 1; i < v.nx; i++) walls.push(CrossSection.square([v.divT, id + 0.2], true).translate([-iw / 2 + iw * i / v.nx, 0]));
    for (let j = 1; j < v.ny; j++) walls.push(CrossSection.square([iw + 0.2, v.divT], true).translate([0, -id / 2 + id * j / v.ny]));
    if (walls.length) box = box.add(slab(CrossSection.union(walls).intersect(inner.offset(0.1)), divH, v.floor));

    const parts = [part('Caja', v.cBox, box)];
    if (v.lid === 'none') return parts;

    // Tapa: placa + encastre que entra en la caja (con holgura)
    const lipOuter = inner.offset(-v.tol, 'Round', 2, 32);
    const lipRing = lipOuter.subtract(lipOuter.offset(-1.2, 'Round', 2, 32));
    let lid = slab(outer, v.lidT).add(slab(lipRing, v.lip, v.lidT - 0.01));
    const off = [W + 10, 0, 0];
    let textSolid = null;
    if ((v.text || '').trim()) {
      const font = await ctx.font(v.font);
      let txt = fitInto(stackLines(String(v.text).split('\n').map(s => ({ font, text: s, height: 10 })), 2), W * 0.74, D * 0.5);
      txt = txt.mirror([1, 0]); // se lee bien cuando la tapa se da vuelta
      textSolid = slab(txt, 0.6);
      lid = lid.subtract(textSolid);
    }
    parts.push(part('Tapa', v.cLid, lid.translate(off)));
    if (textSolid) parts.push(part('Texto de la tapa', v.cText, textSolid.translate(off)));
    return mergeByColor(parts);
  },
};
