/**
 * Bandejita desde foto o dibujo: la silueta de la imagen es la bandeja (con pared alrededor)
 * y el dibujo va en colores en el fondo. Para anillos, llaves o caramelos.
 */
import { wasm, outline, fillHoles, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { maskToShape, sampleColorLayers } from '../engine/trace.js';

export default {
  id: 'bandeja-foto',
  title: 'Bandejita desde foto',
  description: 'Tu dibujo o foto como bandejita: la silueta es la forma y los colores van en el fondo.',
  fileName: () => 'bandejita',
  params: [
    { type: 'group', label: 'Imagen' },
    { key: 'image', type: 'image', label: 'Foto o dibujo', default: '', hint: 'Mejor un dibujo de colores planos o una foto con fondo liso. Mientras no subas nada se muestra un ejemplo.' },
    { key: 'removeBg', type: 'toggle', label: 'Quitar el fondo', default: true },
    { key: 'ncolors', type: 'segment', label: 'Colores', default: 3, options: [1, 2, 3, 4, 5].map(n => ({ value: n, label: String(n) })) },
    { key: 'smooth', type: 'number', label: 'Suavizado', default: 0.6, min: 0, max: 3, step: 0.1, unit: 'mm' },

    { type: 'group', label: 'Bandeja' },
    { key: 'size', type: 'number', label: 'Tamaño', default: 110, min: 50, max: 220, step: 1, unit: 'mm' },
    { key: 'wallH', type: 'number', label: 'Alto de la pared', default: 12, min: 4, max: 40, step: 0.5, unit: 'mm' },
    { key: 'wall', type: 'number', label: 'Ancho de la pared', default: 3, min: 1.2, max: 8, step: 0.2, unit: 'mm' },
    { key: 'floor', type: 'number', label: 'Fondo', default: 2.4, min: 1.2, max: 5, step: 0.2, unit: 'mm' },
    { key: 'round', type: 'number', label: 'Simplificar la silueta', default: 3, min: 0, max: 12, step: 0.5, unit: 'mm', hint: 'Redondea entradas finitas que no sirven para una bandeja.' },
    { key: 'cWall', type: 'color', label: 'Pared y fondo', default: '#F5F5F5' },
    { key: 'useImg', type: 'toggle', label: 'Colores de la imagen en el fondo', default: true },
  ],
  async build(v, ctx) {
    const { CrossSection } = wasm();
    const res = v.image && ctx.colors ? await ctx.colors(v.image, { colors: Math.max(1, +v.ncolors), maxPx: 360, removeBg: !!v.removeBg }) : sampleColorLayers();
    let layers = res.layers.slice(0, Math.max(1, +v.ncolors)).map(l => ({ color: l.color, cs: maskToShape(l.mask, { width: 100, smooth: v.smooth, minArea: 0.05, center: false }) })).filter(l => !l.cs.isEmpty());
    if (!layers.length) throw new Error('La imagen quedó vacía.');
    let all = CrossSection.union(layers.map(l => l.cs));
    const b = all.bounds(), k = (v.size - 2 * v.wall) / Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]);
    const c = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
    const place = cs => cs.translate(c).scale([k, k]);
    all = place(all);
    // Silueta: la isla más grande, sin agujeros y con las entradas finitas rellenas
    const big = all.decompose().sort((a, b2) => b2.area() - a.area())[0] || all;
    let sil = fillHoles(big);
    if (v.round > 0) sil = sil.offset(v.round, 'Round', 2, 24).offset(-v.round, 'Round', 2, 24);
    const outer = outline(sil, v.wall);
    const parts = [];
    let tray = slab(outer, v.floor + v.wallH).subtract(slab(sil, v.wallH + 1, v.floor));
    if (v.useImg) {
      let used = null;
      layers.forEach((l, i) => {
        let cs = place(l.cs).intersect(sil);
        if (used) cs = cs.subtract(used);
        used = used ? used.add(cs) : cs;
        if (cs.isEmpty()) return;
        const inl = slab(cs, 0.6, v.floor - 0.6);
        tray = tray.subtract(inl);
        parts.push(part(`Color ${i + 1}`, l.color, inl));
      });
    }
    parts.unshift(part('Bandeja', v.cWall, tray));
    return mergeByColor(parts);
  },
};
