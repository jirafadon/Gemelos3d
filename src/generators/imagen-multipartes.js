/**
 * Imagen multipartes: tu dibujo separado en colores, cada color como una pieza plana
 * que encastra en su hueco de una base. Se imprimen por separado (ideal sin multicolor)
 * y se arma como un rompecabezas.
 */
import { wasm, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { maskToShape, sampleColorLayers } from '../engine/trace.js';

export default {
  id: 'imagen-multipartes',
  title: 'Imagen multipartes',
  description: 'Tu dibujo separado en colores: cada color es una pieza que encastra en su hueco de la base. Para impresoras de un solo color.',
  fileName: () => 'imagen_multipartes',
  params: [
    { type: 'group', label: 'Imagen' },
    { key: 'image', type: 'image', label: 'Dibujo', default: '', hint: 'Colores planos y zonas no muy finitas. Mientras no subas nada se muestra un ejemplo.' },
    { key: 'removeBg', type: 'toggle', label: 'Quitar el fondo', default: true },
    { key: 'ncolors', type: 'segment', label: 'Colores', default: 3, options: [2, 3, 4, 5, 6].map(n => ({ value: n, label: String(n) })) },
    { key: 'minPiece', type: 'number', label: 'Pieza mínima', default: 12, min: 1, max: 100, step: 1, unit: 'mm²', hint: 'Más chico que esto no se imprime suelto: queda como parte de la base.' },

    { type: 'group', label: 'Piezas' },
    { key: 'size', type: 'number', label: 'Tamaño', default: 120, min: 50, max: 250, step: 1, unit: 'mm' },
    { key: 'border', type: 'number', label: 'Borde de la base', default: 4, min: 1.5, max: 15, step: 0.5, unit: 'mm' },
    { key: 'baseT', type: 'number', label: 'Base', default: 2, min: 1, max: 5, step: 0.2, unit: 'mm' },
    { key: 'pocket', type: 'number', label: 'Hondo del encastre', default: 1.6, min: 0.6, max: 4, step: 0.2, unit: 'mm' },
    { key: 'pieceT', type: 'number', label: 'Espesor de las piezas', default: 2.6, min: 1, max: 6, step: 0.2, unit: 'mm' },
    { key: 'gap', type: 'number', label: 'Holgura', default: 0.15, min: 0, max: 0.6, step: 0.05, unit: 'mm' },
    { key: 'layout', type: 'segment', label: 'Mostrar', default: 'apart', options: [{ value: 'apart', label: 'Para imprimir' }, { value: 'placed', label: 'Armado' }] },
    { key: 'cBase', type: 'color', label: 'Base', default: '#1E1E1E' },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    const res = v.image && ctx.colors ? await ctx.colors(v.image, { colors: +v.ncolors, maxPx: 360, removeBg: !!v.removeBg }) : sampleColorLayers();
    const ls = res.layers.slice(0, +v.ncolors).map(l => ({ color: l.color, cs: maskToShape(l.mask, { width: 100, smooth: 0.5, minArea: 0.05, center: false }) })).filter(l => !l.cs.isEmpty());
    if (!ls.length) throw new Error('No encontré colores en la imagen.');
    const all0 = CrossSection.union(ls.map(l => l.cs)), b = all0.bounds();
    const k = (v.size - 2 * v.border) / Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]), c = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
    let used = null;
    const pieces = [];
    for (const l of ls) {
      let cs = l.cs.translate(c).scale([k, k]);
      if (used) cs = cs.subtract(used);
      used = used ? used.add(cs) : cs;
      for (const isl of cs.decompose()) if (isl.area() >= v.minPiece) pieces.push({ color: l.color, cs: isl });
    }
    const art = CrossSection.union(pieces.map(p => p.cs));
    const outerSil = fillHoles(outline(used, v.border));
    // Base con un hueco por pieza (agrandado por la holgura)
    let base = slab(outerSil, v.baseT + v.pocket).subtract(slab(art.offset(v.gap, 'Round', 2, 16), v.pocket + 0.01, v.baseT));
    const parts = [part('Base', v.cBase, base)];
    const ob = outerSil.bounds();
    let x = ob.max[0] + 10, y = ob.min[1], rowH = 0;
    pieces.sort((a, b2) => b2.cs.area() - a.cs.area()).forEach((p, i) => {
      const cs = p.cs.offset(-v.gap / 2, 'Round', 2, 16);
      if (cs.isEmpty()) return;
      let solid = slab(cs, v.pieceT);
      if (v.layout === 'placed') solid = solid.translate([0, 0, v.baseT]);
      else {
        const pb = cs.bounds(), w = pb.max[0] - pb.min[0], h = pb.max[1] - pb.min[1];
        if (y + h > ob.max[1] + (ob.max[1] - ob.min[1]) * 0.6) { y = ob.min[1]; x += rowH + 6; rowH = 0; }
        solid = solid.translate([x - pb.min[0], y - pb.min[1], 0]);
        y += h + 6; rowH = Math.max(rowH, w);
      }
      parts.push(part(`Color ${i + 1}`, p.color, solid));
    });
    return mergeByColor(parts);
  },
};
