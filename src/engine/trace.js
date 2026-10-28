/**
 * Máscara de píxeles → forma 2D (CrossSection) en mm.
 * La máscara es { width, height, data } con data[y*width+x] = 1 donde hay material.
 * Funciona igual en el navegador y en Node (no usa canvas).
 */
import { wasm, signedArea } from './geom.js';
import { track } from './gc.js';

/**
 * @param mask
 * @param opts.width    ancho final en mm (el alto se calcula proporcional)
 * @param opts.smooth   suavizado de bordes en mm (redondea la escalera de píxeles)
 * @param opts.minArea  descarta islas más chicas que esto (mm²)
 * @param opts.fill     rellena los huecos interiores (deja solo la silueta)
 */
export function maskToShape(mask, { width = 50, smooth = 0.4, minArea = 1, fill = false } = {}) {
  const { CrossSection } = wasm();
  const { width: W, height: H, data } = mask;
  const k = width / W;
  const polys = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (!data[y * W + x]) { x++; continue; }
      const s = x;
      while (x < W && data[y * W + x]) x++;
      // Pequeño solape vertical para que las filas se fusionen sin costuras
      const x0 = s * k, x1 = x * k, y0 = -(y + 1) * k - 0.001, y1 = -y * k + 0.001;
      polys.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    }
  }
  if (!polys.length) return track(new CrossSection([], 'NonZero'));
  let cs = track(new CrossSection(polys, 'NonZero'));
  if (smooth > 0) cs = cs.offset(smooth, 'Round', 2, 16).offset(-smooth * 2, 'Round', 2, 16).offset(smooth, 'Round', 2, 16);
  cs = cs.simplify(Math.min(0.05, k * 0.25));
  // Limpia islas chicas y, si se pide, los agujeros
  let kept = cs.toPolygons();
  if (fill) kept = kept.filter(p => signedArea(p) > 0);
  kept = kept.filter(p => Math.abs(signedArea(p)) >= minArea || signedArea(p) < 0);
  cs = track(new CrossSection(kept, 'NonZero'));
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
