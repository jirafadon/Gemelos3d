/**
 * Siluetas navideñas 2D (centradas en el origen, en mm), diseño propio.
 * Cada una devuelve { shape, deco, area: [ancho, alto, y] } donde:
 * - shape = la silueta (o el marco calado) que lleva el color del adorno,
 * - deco  = detalles para un segundo color (moño, bayas, rayas, nariz…), o null,
 * - area  = zona sugerida para el nombre.
 */
import { wasm, circle, roundedRect, ellipse, polygonShape } from './geom.js';
import { smooth } from './shapes.js';

const TAU = Math.PI * 2;
const U = (...cs) => wasm().CrossSection.union(cs.flat().filter(Boolean));
const cap = (a, b, t) => wasm().CrossSection.hull([circle(t / 2, 24).translate(a), circle(t / 2, 24).translate(b)]);
const stroke = (pts, t) => U(pts.slice(1).map((p, i) => cap(pts[i], p, t)));
const arcPts = (cx, cy, r, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

/** Moño: dos lazos y un nudo (ancho w). */
export function bow(w) {
  const l = ellipse(w * 0.5, w * 0.3);
  const loopL = l.subtract(ellipse(w * 0.26, w * 0.12)).rotate(18).translate([-w * 0.24, 0]);
  const loopR = l.subtract(ellipse(w * 0.26, w * 0.12)).rotate(-18).translate([w * 0.24, 0]);
  const tails = [polygonShape([[-w * 0.04, 0], [-w * 0.2, -w * 0.38], [-w * 0.1, -w * 0.4], [w * 0.02, -w * 0.06]]),
    polygonShape([[w * 0.04, 0], [w * 0.2, -w * 0.38], [w * 0.1, -w * 0.4], [-w * 0.02, -w * 0.06]])];
  return smooth(U(loopL, loopR, ...tails, circle(w * 0.09, 32)), w * 0.01);
}

/** Bola con capuchón, moño y gajos calados (marco de ancho rim). */
export function bauble(d, rim) {
  const R = d / 2;
  const outer = circle(R, 128);
  const capS = roundedRect(R * 0.5, R * 0.2, R * 0.04).translate([0, R * 1.0]);
  const frame = outer.subtract(circle(R - rim, 128));
  // Gajos: arcos que van de arriba a abajo
  const lines = [];
  for (const k of [-0.55, 0, 0.55]) {
    if (k === 0) { lines.push(roundedRect(rim * 0.7, d, rim * 0.35)); continue; }
    const rr = R / Math.abs(k), cx = (k > 0 ? -1 : 1) * (rr - R * Math.abs(k) * 1.15);
    lines.push(circle(rr, 160).subtract(circle(rr - rim * 0.7, 160)).translate([cx, 0]));
  }
  const inner = U(lines).intersect(circle(R - rim * 0.5, 128));
  const b = bow(R * 0.9).translate([0, R * 1.22]);
  return { shape: U(frame, inner, capS), deco: b, area: [d * 0.92, R * 0.7, 0], hangTop: R * 1.22 + R * 0.3 };
}

/** Corona de hojas con bayas y moño abajo. */
export function wreath(d) {
  const R = d / 2, leaves = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360, rr = R * (i % 2 ? 0.74 : 0.84);
    leaves.push(ellipse(R * 0.36, R * 0.16).rotate(a + 90 + (i % 2 ? 25 : -25)).translate([Math.cos(a * Math.PI / 180) * rr, Math.sin(a * Math.PI / 180) * rr]));
  }
  const band = circle(R * 0.86, 96).subtract(circle(R * 0.66, 96));
  const shape = smooth(U(band, leaves), R * 0.012);
  const berries = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.35;
    if (Math.abs(Math.sin(a) + 1) < 0.3) continue; // abajo va el moño
    for (const [dx, dy] of [[0, 0], [R * 0.06, R * 0.04]]) berries.push(circle(R * 0.045, 20).translate([Math.cos(a) * R * 0.79 + dx, Math.sin(a) * R * 0.79 + dy]));
  }
  const deco = U(berries, bow(R * 0.7).translate([0, -R * 0.78]));
  return { shape, deco, area: [d * 0.86, R * 0.55, R * 0.06], hangTop: R * 0.96 };
}

/** Cabeza de reno con astas y nariz. */
export function reindeer(w) {
  const k = w / 100;
  const head = ellipse(56 * k, 66 * k).translate([0, -6 * k]);
  const snout = ellipse(44 * k, 30 * k).translate([0, -34 * k]);
  const ears = [-1, 1].map(s => ellipse(30 * k, 13 * k).rotate(s * 28).translate([s * 33 * k, 12 * k]));
  const antler = s => stroke([[s * 12 * k, 22 * k], [s * 22 * k, 44 * k], [s * 26 * k, 62 * k]], 7 * k)
    .add(stroke([[s * 22 * k, 44 * k], [s * 38 * k, 52 * k], [s * 46 * k, 64 * k]], 6 * k))
    .add(stroke([[s * 25 * k, 56 * k], [s * 14 * k, 66 * k]], 5 * k))
    .add(stroke([[s * 38 * k, 52 * k], [s * 48 * k, 48 * k]], 5 * k));
  const shape = smooth(U(head, snout, ears, antler(-1), antler(1)), 0.6 * k);
  const deco = U(circle(8 * k, 32).translate([0, -38 * k]), circle(3.2 * k, 20).translate([-12 * k, 12 * k]), circle(3.2 * k, 20).translate([12 * k, 12 * k]));
  return { shape, deco, area: [w * 0.5, w * 0.14, -w * 0.1], hangTop: 70 * k };
}

/** Bastón de caramelo con rayas. */
export function candyCane(h) {
  const t = h * 0.18, r = h * 0.2;
  const pts = [[0, -h / 2 + t / 2], [0, h / 2 - r - t / 2], ...arcPts(r, h / 2 - r - t / 2, r, 180, 0, 20).slice(1), [2 * r, h / 2 - r - t / 2 - r * 0.45]];
  const shape = stroke(pts, t);
  const stripes = [];
  for (let y = -h; y < h; y += t * 1.1) stripes.push(roundedRect(h * 1.2, t * 0.42, 0).rotate(35).translate([r, y]));
  const deco = U(stripes).intersect(shape.offset(-0.01, 'Round', 2, 12));
  const b = shape.bounds();
  return { shape: shape.translate([-(b.min[0] + b.max[0]) / 2, 0]), deco: deco.translate([-(b.min[0] + b.max[0]) / 2, 0]), area: [t * 0.78, h * 0.6, -h * 0.12], areaX: -(b.min[0] + b.max[0]) / 2, vertical: true, hangTop: b.max[1] };
}

/** Gnomo: gorro alto, barba grande y nariz. */
export function gnome(w) {
  const k = w / 100;
  const hat = smooth(polygonShape([[-44 * k, 0], [44 * k, 0], [6 * k, 92 * k], [-2 * k, 96 * k]]), 3 * k).translate([0, 6 * k]);
  const brim = roundedRect(96 * k, 14 * k, 7 * k).translate([0, 6 * k]);
  const beard = smooth(U(ellipse(84 * k, 86 * k).translate([0, -36 * k]), polygonShape([[-42 * k, -30 * k], [42 * k, -30 * k], [0, -100 * k]])), 4 * k);
  const nose = circle(12 * k, 40).translate([0, -4 * k]);
  const shape = U(hat, brim, beard, nose);
  const deco = U(brim, beard.subtract(nose.offset(1.2 * k, 'Round', 2, 16))); // barba y ala blancas
  return { shape, deco, area: [w * 0.62, w * 0.28, w * 0.36], hangTop: 102 * k };
}

/** Galletita de jengibre con glaseado y botones. */
export function gingerbread(w) {
  const k = w / 100;
  const head = circle(22 * k, 64).translate([0, 40 * k]);
  const body = ellipse(52 * k, 62 * k).translate([0, -8 * k]);
  const arms = [-1, 1].map(s => cap([0, 6 * k], [s * 46 * k, 14 * k], 22 * k));
  const legs = [-1, 1].map(s => cap([s * 10 * k, -20 * k], [s * 26 * k, -56 * k], 24 * k));
  const shape = smooth(U(head, body, arms, legs), 2 * k);
  const zig = (x0, y0, x1, y1) => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny); pts.push([x0 + (x1 - x0) * t + (i % 2 ? nx / l * 2.6 * k : 0), y0 + (y1 - y0) * t + (i % 2 ? ny / l * 2.6 * k : 0)]); } return stroke(pts, 2.2 * k); };
  const deco = U(zig(-46 * k, 14 * k, -34 * k, 12 * k), zig(34 * k, 12 * k, 46 * k, 14 * k), zig(-30 * k, -52 * k, -22 * k, -40 * k), zig(22 * k, -40 * k, 30 * k, -52 * k),
    circle(3 * k, 20).translate([-8 * k, 44 * k]), circle(3 * k, 20).translate([8 * k, 44 * k]), stroke(arcPts(0, 38 * k, 9 * k, 200, 340, 10), 2.2 * k));
  return { shape, deco, area: [w * 0.4, w * 0.3, -w * 0.1], hangTop: 64 * k };
}

/** Arbolito de tres pisos con estrella. */
export function treeShape(w) {
  const k = w / 100;
  const tiers = [[96, -34, 44], [76, -4, 40], [54, 24, 36]].map(([tw, y, th]) => polygonShape([[-tw / 2 * k, y * k], [tw / 2 * k, y * k], [0, (y + th) * k]]));
  const trunk = roundedRect(18 * k, 16 * k, 2 * k).translate([0, -42 * k]);
  const shape = smooth(U(tiers, trunk), 1.6 * k);
  const st = polygonShape(Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 6 : 14) * k; return [Math.cos(a) * r, Math.sin(a) * r + 62 * k]; }));
  const balls = [[-26, -24], [22, -18], [-14, 8], [16, 12], [-4, 32]].map(([x, y]) => circle(4 * k, 24).translate([x * k, y * k]));
  return { shape: U(shape, st), deco: U(st, balls), area: [w * 0.5, w * 0.18, -w * 0.16], hangTop: 76 * k };
}

/** Campana con badajo y moño. */
export function bell(w) {
  const k = w / 100, pts = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([(18 + 30 * t ** 1.8) * k, (40 - 70 * t) * k]); }
  const half = [...pts, [52 * k, -34 * k], [0, -34 * k]];
  const shape = smooth(polygonShape([...half, ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y])]).add(circle(18 * k, 48).translate([0, 40 * k])).add(circle(9 * k, 32).translate([0, -40 * k])), 1.5 * k);
  const deco = U(roundedRect(98 * k, 7 * k, 3.5 * k).translate([0, -24 * k]), bow(46 * k).translate([0, 56 * k]));
  return { shape, deco, area: [w * 0.66, w * 0.2, -w * 0.02], hangTop: 72 * k };
}
