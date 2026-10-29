/**
 * Litofanía: la foto aparece a contraluz. Lo oscuro queda más grueso y lo claro más fino.
 * Plana o curva; por defecto sale parada (es como mejor se imprime) con un pie para apoyarla.
 */
import { wasm, roundedRect, slab, part } from '../engine/geom.js';

/** Imagen de ejemplo: corazón oscuro sobre un degradé, para cuando todavía no se subió foto. */
export function sampleGray(cols = 160, rows = 120) {
  const data = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const u = (x / cols - 0.5) * 3 * cols / rows, v = -(y / rows - 0.47) * 3;
    const f = (u * u + v * v - 1) ** 3 - u * u * v * v * v;
    const inside = Math.max(0, Math.min(1, 0.5 - f * 6));
    const vignette = 0.55 + 0.4 * (1 - Math.min(1, Math.hypot(x / cols - 0.5, y / rows - 0.5) * 1.6));
    data[y * cols + x] = vignette * (1 - inside * 0.85);
  }
  return { width: cols, height: rows, data };
}

/** Grilla de alturas → sólido cerrado (arriba el relieve, abajo plano). */
export function heightfield(gray, width, zOf) {
  const { Manifold, Mesh } = wasm();
  const { width: nx, height: ny, data } = gray;
  const p = width / (nx - 1);
  const N = nx * ny;
  const verts = new Float32Array(N * 2 * 3);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = y * nx + x, X = x * p - width / 2, Y = ((ny - 1) / 2 - y) * p;
    verts.set([X, Y, zOf(data[i])], i * 3);
    verts.set([X, Y, 0], (N + i) * 3);
  }
  const tris = [];
  for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    const a = y * nx + x, b = a + 1, d = a + nx, c = d + 1;
    tris.push(a, d, c, a, c, b);
    tris.push(N + a, N + c, N + d, N + a, N + b, N + c);
  }
  // Borde (recorrido antihorario visto desde arriba) → paredes laterales
  const ring = [];
  for (let x = 0; x < nx; x++) ring.push((ny - 1) * nx + x);
  for (let y = ny - 2; y >= 0; y--) ring.push(y * nx + nx - 1);
  for (let x = nx - 2; x >= 0; x--) ring.push(x);
  for (let y = 1; y < ny - 1; y++) ring.push(y * nx);
  for (let k = 0; k < ring.length; k++) {
    const u = ring[k], w = ring[(k + 1) % ring.length];
    tris.push(u, N + u, N + w, u, N + w, w);
  }
  const mesh = new Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) });
  let m = new Manifold(mesh);
  if (m.volume() < 0) throw new Error('Malla invertida');
  return m;
}

export default {
  id: 'litofania',
  title: 'Litofanía',
  description: 'Tu foto aparece a contraluz. Plana o curva, parada con pie o para lámpara.',
  fileName: () => 'litofania',
  params: [
    { type: 'group', label: 'Foto' },
    { key: 'image', type: 'image', label: 'Foto', default: '', hint: 'Mientras no subas nada se muestra un ejemplo. Fotos con buen contraste quedan mejor.' },
    { key: 'invert', type: 'toggle', label: 'Invertir (negativo)', default: false },
    { key: 'contrast', type: 'number', label: 'Contraste', default: 1.1, min: 0.5, max: 2, step: 0.05, unit: '×' },

    { type: 'group', label: 'Medidas' },
    { key: 'width', type: 'number', label: 'Ancho', default: 100, min: 30, max: 250, step: 1, unit: 'mm' },
    { key: 'minT', type: 'number', label: 'Espesor mínimo (lo claro)', default: 0.8, min: 0.4, max: 2, step: 0.1, unit: 'mm' },
    { key: 'maxT', type: 'number', label: 'Espesor máximo (lo oscuro)', default: 3, min: 1.5, max: 6, step: 0.1, unit: 'mm' },
    { key: 'detail', type: 'segment', label: 'Detalle', default: 0.4, options: [{ value: 0.6, label: 'Rápido' }, { value: 0.4, label: 'Normal' }, { value: 0.25, label: 'Alto' }], hint: 'Tamaño del "píxel" en mm. Alto tarda más y pesa más.' },

    { type: 'group', label: 'Forma' },
    { key: 'curve', type: 'number', label: 'Curvatura', default: 0, min: 0, max: 180, step: 5, unit: '°', hint: '0 = plana. 120° a 180° queda lindo con una vela LED atrás.' },
    { key: 'frame', type: 'number', label: 'Marco', default: 3, min: 0, max: 12, step: 0.5, unit: 'mm' },
    { key: 'stand', type: 'toggle', label: 'Parada con pie', default: true, hint: 'Parada se imprime mejor: el relieve sale más definido.' },
    { key: 'color', type: 'color', label: 'Color', default: '#F5F5F5' },
  ],

  async build(v, ctx) {
    // Tope de resolución para que el navegador no se trabe con fotos grandes
    const cols = Math.max(20, Math.min(600, Math.round(v.width / v.detail)));
    const gray = v.image && ctx.gray ? await ctx.gray(v.image, { cols }) : sampleGray(Math.min(cols, 250), Math.round(Math.min(cols, 250) * 0.75));
    const lum = x => {
      let l = (x - 0.5) * v.contrast + 0.5;
      l = Math.max(0, Math.min(1, l));
      return v.invert ? 1 - l : l;
    };
    const T = Math.max(v.maxT, v.minT + 0.4);
    let solid = heightfield(gray, v.width, g => v.minT + (1 - lum(g)) * (T - v.minT));
    const b = solid.boundingBox();
    const W = b.max[0] - b.min[0], H = b.max[1] - b.min[1];
    if (v.frame > 0) {
      const outer = roundedRect(W + 2 * v.frame, H + 2 * v.frame, Math.min(2, v.frame));
      solid = solid.add(slab(outer.subtract(roundedRect(W - 0.2, H - 0.2, 0)), T));
    }
    if (v.curve > 0) {
      const R = (W + 2 * v.frame) / (v.curve * Math.PI / 180);
      solid = solid.refineToLength(2).warp(p => {
        const a = p[0] / R, r = R + p[2];
        p[0] = r * Math.sin(a); p[2] = r * Math.cos(a) - R;
      });
    }
    if (v.stand) {
      // Parada: el alto de la foto pasa a ser Z. Pie: una barra a lo ancho con ranura
      solid = solid.rotate([90, 0, 0]);
      let bb = solid.boundingBox();
      solid = solid.translate([0, 0, -bb.min[2] + 0]);
      bb = solid.boundingBox();
      if (v.curve === 0) {
        const footD = 14, footH = 4;
        const foot = slab(roundedRect(bb.max[0] - bb.min[0], footD, 2), footH).translate([(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, 0]);
        solid = solid.translate([0, 0, footH - 0.01]).add(foot);
      }
    }
    return [part('Litofanía', v.color, solid)];
  },
};
