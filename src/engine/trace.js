/**
 * Máscara de píxeles → forma 2D (CrossSection) en mm.
 * La máscara es { width, height, data } con data[y*width+x] = 1 donde hay material,
 * y opcionalmente `field` (0..1, cuánto "es material" cada píxel) para bordes suaves,
 * o `polys` (contornos vectoriales de un SVG, en unidades del SVG).
 * Funciona igual en el navegador y en Node (no usa canvas).
 */
import { wasm, signedArea } from './geom.js';
import { track } from './gc.js';

/**
 * Contornos por "marching squares" con interpolación: siguen el borde real del dibujo
 * (no la escalera de píxeles) y salen con muchos menos vértices.
 * Devuelve lazos cerrados en coordenadas de píxel (x a la derecha, y hacia abajo).
 */
export function contours(field, W, H, iso = 0.5) {
  // Grilla con un borde de ceros alrededor, así todos los contornos cierran
  const GW = W + 2, GH = H + 2;
  const g = new Float32Array(GW * GH);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[(y + 1) * GW + x + 1] = field[y * W + x];
  const at = (x, y) => g[y * GW + x];
  const segs = new Map(); // punto de inicio → [fin, ...]
  const key = (x, y) => `${Math.round(x * 64)},${Math.round(y * 64)}`;
  const pts = new Map();
  const addSeg = (a, b) => {
    const ka = key(a[0], a[1]), kb = key(b[0], b[1]);
    if (ka === kb) return;
    pts.set(ka, a); pts.set(kb, b);
    const l = segs.get(ka); if (l) l.push(kb); else segs.set(ka, [kb]);
  };
  const lerp = (x0, y0, v0, x1, y1, v1) => { const t = (iso - v0) / ((v1 - v0) || 1e-9); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
  for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const idx = (a >= iso ? 8 : 0) | (b >= iso ? 4 : 0) | (c >= iso ? 2 : 0) | (d >= iso ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = () => lerp(x, y, a, x + 1, y, b), R = () => lerp(x + 1, y, b, x + 1, y + 1, c);
    const B = () => lerp(x, y + 1, d, x + 1, y + 1, c), L = () => lerp(x, y, a, x, y + 1, d);
    // Material a la izquierda del sentido de avance (y hacia abajo): contornos exteriores en sentido horario en pantalla
    switch (idx) {
      case 1: addSeg(L(), B()); break;
      case 2: addSeg(B(), R()); break;
      case 3: addSeg(L(), R()); break;
      case 4: addSeg(R(), T()); break;
      case 5: { const m = (a + b + c + d) / 4; if (m >= iso) { addSeg(L(), T()); addSeg(R(), B()); } else { addSeg(L(), B()); addSeg(R(), T()); } break; }
      case 6: addSeg(B(), T()); break;
      case 7: addSeg(L(), T()); break;
      case 8: addSeg(T(), L()); break;
      case 9: addSeg(T(), B()); break;
      case 10: { const m = (a + b + c + d) / 4; if (m >= iso) { addSeg(T(), R()); addSeg(B(), L()); } else { addSeg(T(), L()); addSeg(B(), R()); } break; }
      case 11: addSeg(T(), R()); break;
      case 12: addSeg(R(), L()); break;
      case 13: addSeg(R(), B()); break;
      case 14: addSeg(B(), L()); break;
    }
  }
  // Une los segmentos en lazos
  const loops = [];
  for (const [start] of segs) {
    let k = start;
    const loop = [];
    while (true) {
      const list = segs.get(k);
      if (!list || !list.length) break;
      const nk = list.pop();
      if (!list.length) segs.delete(k);
      const p = pts.get(k); loop.push([p[0] - 1, p[1] - 1]);
      k = nk;
      if (k === start) break;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Simplifica un lazo (Douglas-Peucker) con tolerancia en las mismas unidades. */
function simplifyLoop(loop, tol) {
  if (loop.length < 8) return loop;
  const keep = new Uint8Array(loop.length); keep[0] = 1; keep[loop.length - 1] = 1;
  const stack = [[0, loop.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const [ax, ay] = loop[i], [bx, by] = loop[j];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bd = tol;
    for (let k = i + 1; k < j; k++) { const d = Math.abs((loop[k][0] - ax) * dy - (loop[k][1] - ay) * dx) / L; if (d > bd) { bd = d; best = k; } }
    if (best > 0) { keep[best] = 1; stack.push([i, best], [best, j]); }
  }
  return loop.filter((_, i) => keep[i]);
}

/**
 * @param mask
 * @param opts.width    ancho final en mm (el alto se calcula proporcional)
 * @param opts.smooth   suavizado de bordes en mm (redondea esquinas y escalones)
 * @param opts.minArea  descarta islas (y agujeros) más chicas que esto (mm²): "limpieza de motas"
 * @param opts.fill     rellena los huecos interiores (deja solo la silueta)
 */
export function maskToShape(mask, { width = 50, smooth = 0.4, minArea = 1, fill = false, center = true } = {}) {
  const { CrossSection } = wasm();
  let polys;
  let k;
  let cs;
  if (mask.polys) {
    // Vector (SVG): cada forma con su regla de relleno, y después todas juntas
    const b = mask.bounds; k = width / Math.max(1e-6, b.w);
    const parts = mask.polys.map(g => track(new CrossSection(g.loops.map(p => p.map(([x, y]) => [(x - b.x) * k, -(y - b.y) * k])), g.rule)));
    cs = track(CrossSection.union(parts));
    polys = [];
  } else {
    const { width: W, height: H } = mask;
    const field = mask.field || mask.data;
    k = width / W;
    polys = contours(field, W, H, 0.5).map(l => simplifyLoop(l, 0.18).map(([x, y]) => [x * k, -y * k]));
  }
  if (!cs) {
    polys = polys.filter(p => p.length >= 3);
    if (!polys.length) return track(new CrossSection([], 'NonZero'));
    cs = track(new CrossSection(polys, 'EvenOdd'));
  }
  if (smooth > 0) cs = cs.offset(smooth, 'Round', 2, 16).offset(-smooth * 2, 'Round', 2, 16).offset(smooth, 'Round', 2, 16);
  cs = cs.simplify(Math.min(0.03, k * 0.15));
  // Limpia islas y agujeros chicos y, si se pide, todos los agujeros
  let kept = cs.toPolygons();
  if (fill) kept = kept.filter(p => signedArea(p) > 0);
  kept = kept.filter(p => Math.abs(signedArea(p)) >= minArea);
  cs = track(new CrossSection(kept, 'Positive'));
  if (!center) return cs;
  const b = cs.bounds();
  return cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
}

/** Máscara de ejemplo (corazón con una estrella calada) para cuando todavía no se subió imagen. */
export function sampleMask(n = 160) {
  const data = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n - 0.5) * 2.6, v = -(y / n - 0.55) * 2.6;
    const heart = (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
    const a = Math.atan2(v - 0.05, u), r = Math.hypot(u, v - 0.05);
    const starR = 0.32 + 0.16 * Math.cos(5 * a);
    data[y * n + x] = heart && !(r < starR) ? 1 : 0;
  }
  return { width: n, height: n, data };
}

/** Capas de colores de ejemplo (para cuando no hay foto): corazón, estrella y puntitos. */
export function sampleColorLayers(n = 160) {
  const L = [new Uint8Array(n * n), new Uint8Array(n * n), new Uint8Array(n * n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n - 0.5) * 2.6, v = -(y / n - 0.55) * 2.6;
    const heart = (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
    if (!heart) continue;
    const a = Math.atan2(v - 0.05, u), r = Math.hypot(u, v - 0.05);
    const star = r < 0.32 + 0.16 * Math.cos(5 * a);
    const dot = [[-0.55, 0.45], [0.55, 0.45], [0, -0.75]].some(([cx, cy]) => Math.hypot(u - cx, v - cy) < 0.12);
    L[star ? 1 : dot ? 2 : 0][y * n + x] = 1;
  }
  const colors = ['#D62828', '#FCBF49', '#F5F5F5'];
  return { width: n, height: n, palette: colors, layers: L.map((data, i) => ({ color: colors[i], mask: { width: n, height: n, data } })) };
}
