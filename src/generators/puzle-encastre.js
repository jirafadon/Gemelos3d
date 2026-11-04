/**
 * Puzle encastrable (tipo Montessori): una tabla con el hueco de la figura y las piezas
 * de colores que entran en él. La figura sale de tu imagen (separada en colores) o de una forma,
 * y se puede partir en bandas onduladas. Cada pieza puede llevar un botón para agarrarla.
 */
import { wasm, circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { SHAPES, fitInto } from '../engine/shapes.js';
import { maskToShape, sampleColorLayers } from '../engine/trace.js';

const SHAPE_KEYS = ['heart', 'star', 'circle', 'fish', 'paw', 'flower', 'house', 'cloudShape', 'balloonShape', 'bone'].filter(k => SHAPES[k]);
const COLORS = ['#E63946', '#F4A261', '#2A9D8F', '#457B9D', '#FFCA3A', '#8AC926', '#6A4C93', '#FF85A1'];

export default {
  id: 'puzle-encastre',
  title: 'Puzle encastrable',
  description: 'Tabla con el hueco de la figura y piezas de colores que encastran, desde tu dibujo o una forma. Con botones para agarrar.',
  fileName: v => `puzle_encastre_${v.source === 'image' ? 'dibujo' : v.shape}`,
  params: [
    { type: 'group', label: 'Figura' },
    { key: 'source', type: 'segment', label: 'A partir de', default: 'image', options: [{ value: 'image', label: 'Dibujo en colores' }, { value: 'shape', label: 'Forma' }] },
    { key: 'image', type: 'image', label: 'Dibujo', default: '', show: v => v.source === 'image', hint: 'Un dibujo de colores planos: cada color sale como una pieza. Mientras no subas nada se muestra un ejemplo.' },
    { key: 'removeBg', type: 'toggle', label: 'Quitar el fondo', default: true, show: v => v.source === 'image' },
    { key: 'ncolors', type: 'segment', label: 'Colores (piezas)', default: 3, options: [2, 3, 4, 5, 6].map(n => ({ value: n, label: String(n) })), show: v => v.source === 'image' },
    { key: 'shape', type: 'select', label: 'Forma', default: 'heart', options: SHAPE_KEYS.map(k => ({ value: k, label: SHAPES[k].label })), show: v => v.source === 'shape' },
    { key: 'bands', type: 'number', label: 'Partir en piezas', default: 3, min: 1, max: 8, step: 1, unit: '', show: v => v.source === 'shape', hint: 'Bandas onduladas de arriba a abajo.' },
    { key: 'minPiece', type: 'number', label: 'Pieza mínima', default: 40, min: 5, max: 400, step: 5, unit: 'mm²', hint: 'Lo más chico que esto se pega a la pieza vecina (las piecitas chicas se pierden).' },

    { type: 'group', label: 'Tabla y piezas' },
    { key: 'size', type: 'number', label: 'Tamaño de la figura', default: 120, min: 50, max: 240, step: 1, unit: 'mm' },
    { key: 'margin', type: 'number', label: 'Margen de la tabla', default: 12, min: 5, max: 40, step: 1, unit: 'mm' },
    { key: 'boardT', type: 'number', label: 'Espesor de la tabla', default: 6, min: 3, max: 15, step: 0.5, unit: 'mm' },
    { key: 'pocket', type: 'number', label: 'Hondo del hueco', default: 4, min: 1.5, max: 12, step: 0.5, unit: 'mm' },
    { key: 'raise', type: 'number', label: 'Cuánto sobresalen las piezas', default: 1, min: 0, max: 6, step: 0.5, unit: 'mm' },
    { key: 'gap', type: 'number', label: 'Holgura', default: 0.4, min: 0.1, max: 1.5, step: 0.05, unit: 'mm', hint: 'Para chicos conviene holgado: entra y sale fácil.' },
    { key: 'knob', type: 'toggle', label: 'Botón para agarrar cada pieza', default: true },
    { key: 'knobD', type: 'number', label: 'Diámetro del botón', default: 9, min: 5, max: 20, step: 0.5, unit: 'mm', show: v => v.knob },
    { key: 'layout', type: 'segment', label: 'Piezas', default: 'placed', options: [{ value: 'placed', label: 'Puestas en la tabla' }, { value: 'apart', label: 'Al lado (para imprimir)' }] },

    { type: 'group', label: 'Colores' },
    { key: 'cBoard', type: 'color', label: 'Tabla', default: '#E9C46A' },
    { key: 'useImg', type: 'toggle', label: 'Colores del dibujo', default: true, show: v => v.source === 'image' },
    { key: 'cKnob', type: 'color', label: 'Botones', default: '#F5F5F5', show: v => v.knob },
  ],

  async build(v, ctx) {
    const { CrossSection, Manifold } = wasm();
    // Piezas 2D de la figura
    let pieces = [];
    if (v.source === 'image') {
      const res = v.image && ctx.colors ? await ctx.colors(v.image, { colors: +v.ncolors, maxPx: 360, removeBg: !!v.removeBg }) : sampleColorLayers();
      const ls = res.layers.slice(0, +v.ncolors).map(l => ({ color: l.color, cs: maskToShape(l.mask, { width: 100, smooth: 0.5, minArea: 0.01, center: false }) })).filter(l => !l.cs.isEmpty());
      if (!ls.length) throw new Error('No encontré colores en el dibujo.');
      const all = CrossSection.union(ls.map(l => l.cs)), b = all.bounds();
      const k = v.size / Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]), c = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
      let used = null;
      for (const l of ls) {
        let cs = l.cs.translate(c).scale([k, k]);
        if (used) cs = cs.subtract(used);
        used = used ? used.add(cs) : cs;
        // Cada isla de color es una pieza
        for (const isl of cs.decompose()) if (isl.area() > 0.5) pieces.push({ cs: isl, color: v.useImg ? l.color : COLORS[pieces.length % COLORS.length] });
      }
    } else {
      const fig = fitInto(SHAPES[v.shape].make(100, 90), v.size, v.size), b = fig.bounds();
      const n = v.bands, h = (b.max[1] - b.min[1]) / n;
      for (let i = 0; i < n; i++) {
        // Banda ondulada
        // La onda depende del borde (no de la banda), así dos bandas vecinas comparten el mismo corte
        const wave = e => Array.from({ length: 41 }, (_, j) => { const x = b.min[0] - 2 + (b.max[0] - b.min[0] + 4) * j / 40; return [x, b.min[1] + e * h + Math.sin(j / 40 * Math.PI * 2 + e * 1.7) * h * 0.18]; });
        const lo = i === 0 ? [[b.max[0] + 2, b.min[1] - 2], [b.min[0] - 2, b.min[1] - 2]] : wave(i).reverse();
        const hi = i === n - 1 ? [[b.min[0] - 2, b.max[1] + 2], [b.max[0] + 2, b.max[1] + 2]] : wave(i + 1);
        const band = new CrossSection([[...lo, ...hi]], 'NonZero');
        for (const isl of fig.intersect(band).decompose()) if (isl.area() > 0.5) pieces.push({ cs: isl, color: COLORS[i % COLORS.length] });
      }
    }
    // Piezas chicas: se pegan a la vecina con la que más se tocan
    pieces.sort((a, b) => b.cs.area() - a.cs.area());
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.cs.area() >= v.minPiece || pieces.length < 2) continue;
      let best = -1, bl = 0;
      const grown = p.cs.offset(0.6, 'Round', 2, 8);
      pieces.forEach((o, j) => { if (j === i) return; const t = grown.intersect(o.cs).area(); if (t > bl) { bl = t; best = j; } });
      if (best >= 0) { pieces[best].cs = pieces[best].cs.add(p.cs.offset(0.02, 'Round', 2, 8)).subtract(CrossSection.union(pieces.filter((_, j) => j !== best && j !== i).map(x => x.cs))); pieces.splice(i, 1); }
    }
    pieces = pieces.filter(p => !p.cs.isEmpty());
    const figure = CrossSection.union(pieces.map(p => p.cs));

    // Tabla con el hueco
    const fb = figure.bounds();
    const BW = fb.max[0] - fb.min[0] + 2 * v.margin, BH = fb.max[1] - fb.min[1] + 2 * v.margin;
    const cx = (fb.min[0] + fb.max[0]) / 2, cy = (fb.min[1] + fb.max[1]) / 2;
    const board = roundedRect(BW, BH, Math.min(10, v.margin)).translate([cx, cy]);
    const pocketD = Math.min(v.pocket, v.boardT - 1.2);
    const parts = [part('Tabla', v.cBoard, slab(board, v.boardT).subtract(slab(figure.offset(v.gap / 2, 'Round', 2, 16), pocketD + 0.01, v.boardT - pocketD)))];

    // Piezas: entran en el hueco con holgura, del alto del hueco más lo que sobresalen
    const ph = pocketD + v.raise;
    const z = v.layout === 'placed' ? v.boardT - pocketD : 0;
    let xoff = 0;
    pieces.forEach((p, i) => {
      const cs = p.cs.offset(-v.gap / 2, 'Round', 2, 16);
      if (cs.isEmpty()) return;
      let move = [0, 0];
      if (v.layout === 'apart') { const b = cs.bounds(); move = [fb.max[0] + v.margin + 10 + xoff - b.min[0], cy - (b.min[1] + b.max[1]) / 2]; xoff += b.max[0] - b.min[0] + 6; }
      parts.push(part(`Pieza ${i + 1}`, p.color, slab(cs, ph, z).translate([...move, 0])));
      if (v.knob) {
        // Botón en el punto más "adentro" de la pieza
        let r = 0, lo = 0, hi = 40; for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; if (cs.offset(-m, 'Round', 2, 8).isEmpty()) hi = m; else lo = m; } r = lo;
        if (r * 2 >= v.knobD * 0.7) {
          const core = cs.offset(-r * 0.9, 'Round', 2, 8), cb = core.bounds();
          const at = [(cb.min[0] + cb.max[0]) / 2 + move[0], (cb.min[1] + cb.max[1]) / 2 + move[1]];
          const kd = Math.min(v.knobD, r * 1.8);
          const knob = Manifold.cylinder(8, kd / 2, kd / 2, 40).add(Manifold.sphere(kd / 2, 40).scale([1, 1, 0.5]).translate([0, 0, 8])).translate([at[0], at[1], z + ph]);
          parts.push(part('Botones', v.cKnob, knob));
        }
      }
    });
    return mergeByColor(parts);
  },
};
