/**
 * Posavasos con imagen a color: la foto o logo se separa en 2 a 4 tonos (de lo más
 * oscuro a lo más claro) y cada tono va embutido arriba en su color, al ras.
 * Ideal para la U1 con varios cabezales: la cara de arriba queda lisa.
 */
import { circle, roundedRect, slab, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';
import { maskToShape } from '../engine/trace.js';

/** Ejemplo de 3 tonos: corazón oscuro, anillo medio y fondo claro. */
function sampleTones(n) {
  const data = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n - 0.5) * 3.4, v = -(y / n - 0.53) * 3.4, r = Math.hypot(x / n - 0.5, y / n - 0.5);
    const heart = (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
    data[y * n + x] = heart ? 0.08 : r > 0.38 && r < 0.45 ? 0.45 : 0.92;
  }
  return { width: n, height: n, data };
}

export default {
  id: 'posavasos-imagen',
  title: 'Posavasos con imagen a color',
  description: 'Tu foto o logo separada en hasta 4 colores, embutida al ras.',
  fileName: () => 'posavasos_imagen',
  params: [
    { type: 'group', label: 'Imagen' },
    { key: 'image', type: 'image', label: 'Foto o logo', default: '', hint: 'Mientras no subas nada se muestra un ejemplo. Logos con pocos colores quedan mejor.' },
    { key: 'levels', type: 'segment', label: 'Cantidad de colores', default: 3, options: [{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }] },
    { key: 'contrast', type: 'number', label: 'Contraste', default: 1.2, min: 0.5, max: 2.5, step: 0.05, unit: '×' },
    { key: 'shift', type: 'number', label: 'Más claro / más oscuro', default: 0, min: -0.4, max: 0.4, step: 0.02, unit: '' },
    { key: 'detail', type: 'segment', label: 'Detalle', default: 160, options: [{ value: 110, label: 'Rápido' }, { value: 160, label: 'Normal' }, { value: 240, label: 'Alto' }] },

    { type: 'group', label: 'Posavasos' },
    { key: 'shape', type: 'segment', label: 'Forma', default: 'round', options: [{ value: 'round', label: 'Redondo' }, { value: 'square', label: 'Cuadrado' }] },
    { key: 'size', type: 'number', label: 'Tamaño', default: 95, min: 50, max: 150, step: 1, unit: 'mm' },
    { key: 'rim', type: 'number', label: 'Borde', default: 3, min: 0, max: 10, step: 0.5, unit: 'mm' },
    { key: 'thick', type: 'number', label: 'Espesor', default: 4, min: 2.4, max: 8, step: 0.2, unit: 'mm' },
    { key: 'inlay', type: 'number', label: 'Profundidad de los colores', default: 0.6, min: 0.4, max: 2, step: 0.2, unit: 'mm' },

    { type: 'group', label: 'Colores (de oscuro a claro)' },
    { key: 'c1', type: 'color', label: 'Tono 1 (más oscuro)', default: '#1E1E1E' },
    { key: 'c2', type: 'color', label: 'Tono 2', default: '#D62828' },
    { key: 'c3', type: 'color', label: 'Tono 3', default: '#F4A261', show: v => v.levels >= 3 },
    { key: 'c4', type: 'color', label: 'Tono 4', default: '#2A9D8F', show: v => v.levels >= 4 },
    { key: 'cBase', type: 'color', label: 'Fondo (más claro) y borde', default: '#F5F5F5' },
  ],

  async build(v, ctx) {
    const S = v.size;
    const face = v.shape === 'round' ? circle(S / 2, 128) : roundedRect(S, S, S * 0.1);
    const inner = v.rim > 0 ? face.offset(-v.rim, 'Round', 2, 32) : face;
    const gray = v.image && ctx.gray ? await ctx.gray(v.image, { cols: v.detail }) : sampleTones(v.detail);
    const { width: W, height: H, data } = gray;
    const lum = x => Math.max(0, Math.min(1, (x - 0.5) * v.contrast + 0.5 + v.shift));
    // n tonos + el fondo: el tono k toma los píxeles con luminancia en su franja
    const n = v.levels;
    const colors = [v.c1, v.c2, v.c3, v.c4].slice(0, n - 1);
    const bands = colors.map(() => new Uint8Array(W * H));
    for (let i = 0; i < W * H; i++) {
      const k = Math.min(n - 1, Math.floor(lum(data[i]) * n));
      if (k < n - 1) bands[k][i] = 1;
    }
    // La imagen se ajusta para cubrir la cara (se recorta lo que sobra)
    const ib = inner.bounds(), fw = ib.max[0] - ib.min[0], fh = ib.max[1] - ib.min[1];
    const width = Math.max(fw, fh * W / H);
    const T = v.thick, d = Math.min(v.inlay, T - 1);
    const parts = [];
    let used = null;
    bands.forEach((mask, k) => {
      let count = 0;
      for (let i = 0; i < mask.length; i++) count += mask[i];
      if (count < 8) return; // tono sin píxeles: no hace falta ese color
      let sh;
      try { sh = maskToShape({ width: W, height: H, data: mask }, { width, smooth: 0.25, minArea: 0.6 }); } catch { return; }
      sh = sh.intersect(inner);
      if (sh.isEmpty()) return;
      if (used) sh = sh.subtract(used);
      used = used ? used.add(sh) : sh;
      parts.push(part(`Tono ${k + 1}`, colors[k], slab(sh, d, T - d)));
    });
    let base = slab(face, T);
    if (used) base = base.subtract(slab(used, d + 0.01, T - d));
    parts.unshift(part('Fondo', v.cBase, base));
    return mergeByColor(parts);
  },
};
