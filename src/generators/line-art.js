/**
 * Placa de line art: un dibujo de línea fina (silueta, retrato, mascota) recortado,
 * parado sobre una base con ranura y el nombre al frente.
 */
import { wasm, slab, part } from '../engine/geom.js';
import { mergeByColor, stackLines, slotBase, placeBelow } from '../engine/layers.js';
import { fitInto } from '../engine/shapes.js';
import { imageParams, silhouette, firstLine } from './_common.js';

export default {
  id: 'line-art',
  title: 'Placa de line art',
  description: 'Dibujo de línea fina parado sobre una base con el nombre al frente.',
  fileName: v => `line_art_${firstLine(v.name, 'dibujo')}`,
  params: [
    { type: 'group', label: 'Dibujo' },
    ...imageParams({ label: 'Dibujo de línea (fondo blanco)' }),
    { key: 'height', type: 'number', label: 'Alto del dibujo', default: 120, min: 40, max: 240, step: 1, unit: 'mm' },
    { key: 'thicken', type: 'number', label: 'Engrosar las líneas', default: 0.6, min: 0, max: 3, step: 0.1, unit: 'mm', hint: 'Que las líneas midan 1,5 mm o más para que el dibujo sea firme.' },
    { key: 'bar', type: 'toggle', label: 'Barra de unión abajo', default: true, hint: 'Une todas las líneas abajo para que el dibujo sea una sola pieza.' },
    { key: 'dropLoose', type: 'toggle', label: 'Quitar partes sueltas', default: true, hint: 'Saca las líneas que no tocan el resto del dibujo (se caerían al recortarlo).' },
    { key: 'thick', type: 'number', label: 'Espesor del dibujo', default: 3, min: 2, max: 6, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Base' },
    { key: 'name', type: 'text', label: 'Nombre al frente', default: 'Luna' },
    { key: 'font', type: 'font', label: 'Tipografía', default: 'dancing', show: v => !!(v.name || '').trim() },
    { key: 'tol', type: 'number', label: 'Holgura de la ranura', default: 0.25, min: 0, max: 0.8, step: 0.05, unit: 'mm' },
    { key: 'color', type: 'color', label: 'Dibujo', default: '#1E1E1E' },
    { key: 'cBase', type: 'color', label: 'Base', default: '#C9A66B' },
    { key: 'cName', type: 'color', label: 'Nombre', default: '#1E1E1E', show: v => !!(v.name || '').trim() },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    let art = await silhouette(v, ctx, 100, { fill: false });
    // Sin imagen, el ejemplo se convierte en contorno (como un dibujo de línea)
    if (!v.image) art = art.subtract(art.offset(-1.5, 'Round', 2, 16));
    const b0 = art.bounds();
    art = art.scale(v.height / (b0.max[1] - b0.min[1]));
    if (v.thicken > 0) art = art.offset(v.thicken / 2, 'Round', 2, 16);
    const b = art.bounds();
    const w = b.max[0] - b.min[0];
    art = art.translate([-(b.min[0] + b.max[0]) / 2, -b.min[1] + 6]);
    // Barra + lengüeta que entra en la ranura de la base
    const tab = CrossSection.square([w * 0.9, 6.5], false).translate([-w * 0.45, 0]);
    if (v.bar) art = art.add(tab).add(CrossSection.square([w, 3], false).translate([-w / 2, 5]));
    else art = art.add(tab);
    if (v.dropLoose) {
      // Se queda solo con la parte unida a la lengüeta de la base
      const comps = art.decompose();
      const keep = comps.filter(c => !c.intersect(tab).isEmpty());
      if (keep.length) art = CrossSection.union(keep);
    }
    const parts = [part('Dibujo', v.color, slab(art, v.thick))];
    const base = slotBase({ length: w + 16, slotLength: w * 0.9 + 0.6, plate: v.thick, tol: v.tol, depth: 30, height: 14, slotDepth: 6, color: v.cBase });
    const placed = placeBelow(base.solid, parts[0].solid, 10);
    parts.push(part('Base', v.cBase, placed));
    if ((v.name || '').trim()) {
      const font = await ctx.font(v.font);
      const pb = placed.boundingBox();
      const txt = fitInto(stackLines([{ font, text: v.name, height: 10 }], 0), w, 9);
      parts.push(part('Nombre', v.cName, txt.extrude(1).rotate([90, 0, 0]).translate([(pb.min[0] + pb.max[0]) / 2, pb.min[1], 7])));
    }
    return mergeByColor(parts);
  },
};
