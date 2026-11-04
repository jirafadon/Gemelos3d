/**
 * Jarrones y macetas paramétricos: perfil con anillos (base, panza, cuello, boca),
 * sección redonda, poligonal, ondulada (suave o recta), estrella o flor, y giro en espiral.
 * Sale macizo para imprimir en modo jarrón (espiral) o con pared y fondo.
 */
import { wasm, part } from '../engine/geom.js';
import { mergeByColor } from '../engine/layers.js';

const PRESETS = {
  bottle: { label: 'Botella', rings: [[0, 0.70], [0.32, 1.0], [0.72, 0.42], [1, 0.5]] },
  amphora: { label: 'Ánfora', rings: [[0, 0.55], [0.45, 1.0], [0.85, 0.55], [1, 0.72]] },
  cylinder: { label: 'Cilindro', rings: [[0, 1], [0.5, 1], [1, 1]] },
  tulip: { label: 'Tulipán', rings: [[0, 0.55], [0.35, 0.75], [0.8, 1.0], [1, 0.92]] },
  bowl: { label: 'Cuenco', rings: [[0, 0.55], [0.5, 0.95], [1, 1.0]] },
  cone: { label: 'Cono invertido', rings: [[0, 0.5], [1, 1]] },
};

const SECTIONS = [
  { value: 'round', label: 'Redonda' }, { value: 'polygon', label: 'Polígono' }, { value: 'wave', label: 'Ondas' },
  { value: 'star', label: 'Estrella' }, { value: 'flower', label: 'Flor' },
];

/** Radio relativo de la sección en el ángulo a (1 = el radio del perfil). */
function sectionAt(v, a) {
  switch (v.section) {
    case 'polygon': {
      const n = v.sides, seg = (2 * Math.PI) / n;
      const x = ((a % seg) + seg) % seg - seg / 2;
      const flat = Math.cos(seg / 2) / Math.cos(x);
      return 1 + (flat - 1) * (1 - v.round / 100);
    }
    case 'wave': {
      const s = Math.sin(a * v.waves);
      // Recta: onda triangular (aristas marcadas); suave: senoidal
      const w = v.waveKind === 'straight' ? (2 / Math.PI) * Math.asin(s) : s;
      return 1 + (v.amp / 100) * w;
    }
    case 'star': {
      const t = (Math.cos(a * v.points) + 1) / 2;
      return 1 - (v.depth / 100) * (1 - Math.pow(t, 0.6));
    }
    case 'flower': {
      const t = Math.abs(Math.cos(a * v.points / 2));
      return 1 - (v.depth / 100) * (1 - Math.pow(t, 0.5));
    }
    default: return 1;
  }
}

/** Perfil suave que pasa por los anillos (Catmull-Rom), r relativo a 1. */
function profileAt(rings, t) {
  const n = rings.length;
  if (t <= rings[0][0]) return rings[0][1];
  if (t >= rings[n - 1][0]) return rings[n - 1][1];
  let i = 0; while (i < n - 2 && t > rings[i + 1][0]) i++;
  const p0 = rings[Math.max(0, i - 1)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(n - 1, i + 2)];
  const u = (t - p1[0]) / ((p2[0] - p1[0]) || 1);
  const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * (p2[0] - p1[0]);
  const m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * (p2[0] - p1[0]);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * p1[1] + h10 * m1 + h01 * p2[1] + h11 * m2;
}

/** Sólido a partir de anillos: grilla de puntos cerrada con tapas. */
function ringSolid(N, M, point) {
  const { Manifold, Mesh } = wasm();
  const verts = new Float32Array((N * M + 2) * 3);
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) verts.set(point(i, j), (j * N + i) * 3);
  const bot = N * M, top = N * M + 1;
  const zb = point(0, 0)[2], zt = point(0, M - 1)[2];
  verts.set([0, 0, zb], bot * 3); verts.set([0, 0, zt], top * 3);
  const tris = [];
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i, b = j * N + (i + 1) % N, c = (j + 1) * N + (i + 1) % N, d = (j + 1) * N + i;
    tris.push(a, b, c, a, c, d);
  }
  for (let i = 0; i < N; i++) { tris.push(bot, (i + 1) % N, i); tris.push(top, (M - 1) * N + i, (M - 1) * N + (i + 1) % N); }
  return new Manifold(new Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) }));
}

export default {
  id: 'jarron',
  title: 'Jarrones y macetas',
  description: 'Perfil a gusto (botella, ánfora, tulipán…), sección redonda, poligonal, ondas o estrella, y giro en espiral.',
  fileName: v => `jarron_${v.preset}_${v.section}`,
  params: [
    { type: 'group', label: 'Perfil' },
    { key: 'preset', type: 'select', label: 'Forma', default: 'bottle', options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
    { key: 'height', type: 'number', label: 'Alto', default: 160, min: 40, max: 350, step: 1, unit: 'mm' },
    { key: 'radius', type: 'number', label: 'Radio máximo', default: 50, min: 15, max: 150, step: 1, unit: 'mm' },
    { key: 'base', type: 'number', label: 'Base', default: 100, min: 40, max: 160, step: 1, unit: '%', hint: 'Agranda o achica el anillo de abajo.' },
    { key: 'belly', type: 'number', label: 'Panza', default: 100, min: 40, max: 160, step: 1, unit: '%' },
    { key: 'bellyH', type: 'number', label: 'Altura de la panza', default: 0, min: -30, max: 30, step: 1, unit: '%' },
    { key: 'neck', type: 'number', label: 'Cuello', default: 100, min: 40, max: 160, step: 1, unit: '%' },
    { key: 'lip', type: 'number', label: 'Boca', default: 100, min: 40, max: 160, step: 1, unit: '%' },

    { type: 'group', label: 'Sección' },
    { key: 'section', type: 'segment', label: 'Sección', default: 'wave', options: SECTIONS },
    { key: 'sides', type: 'number', label: 'Lados', default: 8, min: 3, max: 24, step: 1, unit: '', show: v => v.section === 'polygon' },
    { key: 'round', type: 'number', label: 'Redondeo', default: 20, min: 0, max: 100, step: 1, unit: '%', show: v => v.section === 'polygon' },
    { key: 'waveKind', type: 'segment', label: 'Tipo de onda', default: 'smooth', options: [{ value: 'smooth', label: 'Suave' }, { value: 'straight', label: 'Recta' }], show: v => v.section === 'wave' },
    { key: 'waves', type: 'number', label: 'Cantidad', default: 20, min: 3, max: 60, step: 1, unit: '', show: v => v.section === 'wave' },
    { key: 'amp', type: 'number', label: 'Amplitud', default: 5, min: 1, max: 25, step: 0.5, unit: '%', show: v => v.section === 'wave' },
    { key: 'points', type: 'number', label: 'Puntas', default: 6, min: 3, max: 16, step: 1, unit: '', show: v => v.section === 'star' || v.section === 'flower' },
    { key: 'depth', type: 'number', label: 'Profundidad', default: 18, min: 3, max: 45, step: 1, unit: '%', show: v => v.section === 'star' || v.section === 'flower' },
    { key: 'twist', type: 'number', label: 'Giro en espiral', default: 90, min: -360, max: 360, step: 5, unit: '°' },
    { key: 'twistEase', type: 'toggle', label: 'Giro que vuelve (ida y vuelta)', default: false, show: v => v.twist !== 0 },

    { type: 'group', label: 'Impresión' },
    { key: 'mode', type: 'segment', label: 'Cómo se imprime', default: 'vase', options: [{ value: 'vase', label: 'Modo jarrón' }, { value: 'wall', label: 'Con pared' }],
      hint: v => (v.mode === 'vase' ? 'Sale macizo: activá "modo jarrón" o "espiral" en el laminador y queda hueco con una sola pared.' : 'Sale hueco con la pared y el fondo que elijas.') },
    { key: 'wall', type: 'number', label: 'Pared', default: 2, min: 0.8, max: 6, step: 0.1, unit: 'mm', show: v => v.mode === 'wall' },
    { key: 'bottom', type: 'number', label: 'Fondo', default: 2.4, min: 0.8, max: 8, step: 0.2, unit: 'mm', show: v => v.mode === 'wall' },
    { key: 'drain', type: 'number', label: 'Agujero de drenaje (maceta)', default: 0, min: 0, max: 20, step: 1, unit: 'mm', show: v => v.mode === 'wall' },
    { key: 'quality', type: 'segment', label: 'Detalle', default: 'normal', options: [{ value: 'low', label: 'Facetado' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alto' }] },
    { key: 'color', type: 'color', label: 'Color', default: '#2A9D8F' },
  ],

  async build(v) {
    const { Manifold } = wasm();
    const P = PRESETS[v.preset] || PRESETS.bottle;
    // Anillos ajustables: base (primero), panza (el más ancho), cuello (el siguiente) y boca (último)
    const rings = P.rings.map(r => r.slice());
    const n = rings.length;
    const bi = rings.reduce((b, r, i) => (r[1] > rings[b][1] ? i : b), 0);
    rings[0][1] *= v.base / 100;
    if (bi > 0 && bi < n - 1) { rings[bi][1] *= v.belly / 100; rings[bi][0] = Math.min(0.9, Math.max(0.1, rings[bi][0] + v.bellyH / 100)); }
    if (n > 3 && bi + 1 < n - 1) rings[bi + 1][1] *= v.neck / 100;
    rings[n - 1][1] *= v.lip / 100;
    for (let i = 1; i < n; i++) rings[i][0] = Math.max(rings[i][0], rings[i - 1][0] + 0.02);
    const maxR = Math.max(...Array.from({ length: 50 }, (_, i) => profileAt(rings, i / 49)));
    const scale = v.radius / maxR;

    const Q = { low: [v.section === 'polygon' ? v.sides * 4 : 48, 24], normal: [240, 120], high: [480, 220] }[v.quality] || [240, 120];
    const N = v.section === 'wave' ? Math.max(Q[0], v.waves * 12) : Q[0], M = Q[1];
    const twistAt = t => (v.twist * Math.PI / 180) * (v.twistEase ? Math.sin(Math.PI * t) : t);
    const H = v.height;
    const point = (i, j, inset = 0, z0 = 0) => {
      const t = j / (M - 1), z = z0 + (H - z0) * t;
      const a = (i / N) * 2 * Math.PI;
      const r = Math.max(1, profileAt(rings, z / H) * scale * sectionAt(v, a - twistAt(z / H)) - inset);
      return [Math.cos(a) * r, Math.sin(a) * r, z];
    };
    let body = ringSolid(N, M, (i, j) => point(i, j));
    if (v.mode === 'wall') {
      const inner = ringSolid(N, M, (i, j) => { const p = point(i, j, v.wall, v.bottom); if (j === M - 1) p[2] = H + 1; return p; });
      body = body.subtract(inner);
      if (v.drain > 0) body = body.subtract(Manifold.cylinder(v.bottom + 2, v.drain / 2, v.drain / 2, 48).translate([0, 0, -1]));
    }
    return mergeByColor([part('Jarrón', v.color, body)]);
  },
};
