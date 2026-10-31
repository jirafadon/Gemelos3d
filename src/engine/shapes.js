/**
 * Formas 2D listas para usar (todas centradas en el origen, en mm).
 */
import { wasm, circle, roundedRect, ellipse, polygonShape } from './geom.js';

const TAU = Math.PI * 2;

/** Suaviza esquinas: achica y vuelve a agrandar (redondea los cóncavos). */
export const smooth = (cs, r) => (r > 0 ? cs.offset(-r, 'Round', 2, 32).offset(r * 2, 'Round', 2, 32).offset(-r, 'Round', 2, 32) : cs);

/** Escala una forma para que su caja mida exactamente w × h (deformando). */
export function stretchTo(cs, w, h) {
  const b = cs.bounds();
  const bw = b.max[0] - b.min[0], bh = b.max[1] - b.min[1];
  return cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]).scale([w / bw, h / bh]);
}

/** Escala sin deformar para que entre en w × h, centrada. */
export function fitInto(cs, w, h) {
  const b = cs.bounds();
  const bw = b.max[0] - b.min[0], bh = b.max[1] - b.min[1];
  if (bw <= 0 || bh <= 0) return cs;
  const k = Math.min(w / bw, h / bh);
  return cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]).scale(k);
}

export function heart(w, h = w * 0.9) {
  const pts = [];
  for (let i = 0; i < 160; i++) {
    const t = i / 160 * TAU;
    pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  return stretchTo(polygonShape(pts), w, h);
}

export function star(w, points = 5, inner = 0.45, round = 0.6) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : 1, a = Math.PI / 2 + i * Math.PI / points;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const s = polygonShape(pts).scale(w / 2);
  return round > 0 ? s.offset(-round, 'Round', 2, 24).offset(round, 'Round', 2, 24) : s;
}

export function bone(w, h) {
  const r = h * 0.3;
  const shaft = roundedRect(w - 2 * r, h * 0.52, 0);
  let s = shaft;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) s = s.add(circle(r).translate([sx * (w / 2 - r), sy * (h / 2 - r)]));
  return smooth(s, Math.min(1.5, h * 0.06));
}

export function fish(w, h) {
  const body = ellipse(w * 0.78, h).translate([w * 0.11, 0]);
  const tail = polygonShape([[-w / 2, h * 0.45], [-w / 2 + w * 0.06, 0], [-w / 2, -h * 0.45], [-w * 0.2, 0]]);
  return smooth(body.add(tail), Math.min(1.5, h * 0.05));
}

/** Óvalo con borde ondulado (tipo sello / chapita). */
export function wavyOval(w, h, waves = 20, amp = 0.06) {
  const pts = [];
  for (let i = 0; i < 360; i++) {
    const t = i / 360 * TAU;
    const k = 1 + amp * Math.cos(waves * t);
    pts.push([Math.cos(t) * k, Math.sin(t) * k]);
  }
  return stretchTo(polygonShape(pts), w, h);
}

export function paw(w) {
  const pad = ellipse(w * 0.55, w * 0.45).translate([0, -w * 0.18]);
  let s = pad;
  const toes = [[-0.33, 0.12, 0.2], [-0.12, 0.3, 0.21], [0.12, 0.3, 0.21], [0.33, 0.12, 0.2]];
  for (const [x, y, r] of toes) s = s.add(ellipse(w * r, w * r * 1.2).translate([x * w, y * w]));
  return s;
}

/** Copo de nieve de 6 brazos. */
export function snowflake(d) {
  const { CrossSection } = wasm();
  const R = d / 2, t = Math.max(0.9, d * 0.06);
  let arm = CrossSection.square([t, R], false).translate([-t / 2, 0]);
  for (const f of [0.45, 0.72]) {
    const len = R * (f < 0.6 ? 0.34 : 0.24);
    const branch = CrossSection.square([t * 0.85, len], false).translate([-t * 0.425, 0]);
    arm = arm.add(branch.rotate(45).translate([0, R * f])).add(branch.rotate(-45).translate([0, R * f]));
  }
  let s = circle(t * 1.6);
  for (let i = 0; i < 6; i++) s = s.add(arm.rotate(i * 60));
  return s;
}

/** Anillo (aro) con ancho w. */
export const ring = (outerR, w) => circle(outerR, 96).subtract(circle(outerR - w, 96));

// ---------- Más formas (todas centradas, ancho w y alto h) ----------
const centered = cs => { const b = cs.bounds(); return cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]); };
const fitBox2 = (cs, w, h) => stretchTo(centered(cs), w, h);
export const hexagon = (w, h) => fitBox2(smooth(circle(10, 6), 0.6), w, h);
export const octagon = (w, h) => fitBox2(smooth(circle(10, 8).rotate(22.5), 0.5), w, h);
export const diamond = (w, h) => fitBox2(smooth(polygonShape([[0, 10], [10, 0], [0, -10], [-10, 0]]), 0.6), w, h);
export function shield(w, h) {
  const right = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; right.push([10 * Math.cos(t * Math.PI / 2) ** 0.7, 15 * (1 - t)]); }
  const pts = [[-10, 25], [10, 25], ...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  return fitBox2(smooth(polygonShape(pts), 0.5), w, h);
}
export function drop(w, h) {
  const { CrossSection } = wasm();
  return fitBox2(CrossSection.hull([circle(10, 96), circle(0.6, 16).translate([0, 18])]), w, h);
}
export const moon = (w, h) => fitBox2(circle(10, 96).subtract(circle(8.4, 96).translate([5.2, 2.6])), w, h);
export function cloudShape(w, h) {
  const { CrossSection } = wasm();
  const s = CrossSection.union([circle(4.8, 64).translate([-5, -1]), circle(6.4, 64).translate([0, 2]), circle(5.2, 64).translate([5.2, 0.4]), roundedRect(18, 6.4, 3.2).translate([0, -1.6])]);
  return fitBox2(smooth(s, 0.4), w, h);
}
export const house = (w, h) => fitBox2(smooth(polygonShape([[-8, -10], [8, -10], [8, 2], [10, 2], [0, 10], [-10, 2], [-8, 2]]), 0.6), w, h);
export function bubble(w, h) {
  const body = roundedRect(20, 13, 4).translate([0, 1.5]);
  return fitBox2(smooth(body.add(polygonShape([[-6, -4.5], [-1, -4.5], [-7, -9]])), 0.3), w, h);
}
export const tagShape = (w, h) => fitBox2(smooth(polygonShape([[-10, 0], [-5, 6], [10, 6], [10, -6], [-5, -6]]), 0.8), w, h);
export function flower(w, h, petals = 6) {
  const { CrossSection } = wasm();
  const parts = [circle(4.2, 48)];
  for (let i = 0; i < petals; i++) { const a = (i / petals) * TAU + Math.PI / 2; parts.push(circle(3.9, 48).translate([Math.cos(a) * 5.6, Math.sin(a) * 5.6])); }
  return fitBox2(CrossSection.union(parts), w, h);
}
export function clover(w, h) {
  const { CrossSection } = wasm();
  const parts = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * TAU / 3; return circle(4.4, 48).translate([Math.cos(a) * 4.4, Math.sin(a) * 4.4]); });
  parts.push(roundedRect(1.8, 6, 0.8).translate([0.8, -7]).rotate(-10));
  return fitBox2(smooth(CrossSection.union(parts), 0.4), w, h);
}
export function crown(w, h) {
  const { CrossSection } = wasm();
  const body = polygonShape([[-10, -6], [10, -6], [10, 4], [5, -1], [0, 6], [-5, -1], [-10, 4]]);
  const balls = [[-10, 4.6], [0, 6.6], [10, 4.6]].map(([x, y]) => circle(1.6, 24).translate([x, y]));
  return fitBox2(smooth(CrossSection.union([body, ...balls]), 0.35), w, h);
}
export const shirt = (w, h) => fitBox2(smooth(polygonShape([[-4, 10], [-10, 7], [-12, 1], [-8, -0.5], [-7, 3], [-7, -10], [7, -10], [7, 3], [8, -0.5], [12, 1], [10, 7], [4, 10], [2, 8], [-2, 8]]), 0.5), w, h);
export function balloonShape(w, h) {
  const body = ellipse(20, 24).translate([0, 2]);
  return fitBox2(body.add(polygonShape([[0, -9.6], [1.8, -12.4], [-1.8, -12.4]])), w, h);
}

export const SHAPES = {
  rect: { label: 'Rectángulo', aspect: 0.5, area: [0.84, 0.6, 0], make: (w, h, r = 3) => roundedRect(w, h, r) },
  oval: { label: 'Óvalo', aspect: 0.62, area: [0.74, 0.44, 0], make: (w, h) => ellipse(w, h) },
  wavy: { label: 'Óvalo ondulado', aspect: 0.72, area: [0.72, 0.42, 0], make: (w, h) => wavyOval(w, h) },
  circle: { label: 'Círculo', aspect: 1, area: [0.74, 0.42, 0], make: (w) => circle(w / 2, 96) },
  heart: { label: 'Corazón', aspect: 0.9, area: [0.62, 0.36, 0.06], make: (w, h) => heart(w, h) },
  bone: { label: 'Hueso', aspect: 0.42, area: [0.56, 0.4, 0], make: (w, h) => bone(w, h) },
  fish: { label: 'Pez', aspect: 0.55, area: [0.5, 0.34, 0], make: (w, h) => fish(w, h) },
  star: { label: 'Estrella', aspect: 1, area: [0.5, 0.24, -0.02], make: (w) => star(w) },
  paw: { label: 'Huella', aspect: 1, area: [0.5, 0.26, -0.18], make: (w) => paw(w) },
  hexagon: { label: 'Hexágono', aspect: 0.87, area: [0.7, 0.4, 0], make: (w, h) => hexagon(w, h) },
  octagon: { label: 'Octógono', aspect: 1, area: [0.74, 0.42, 0], make: (w, h) => octagon(w, h) },
  diamond: { label: 'Rombo', aspect: 0.8, area: [0.5, 0.3, 0], make: (w, h) => diamond(w, h) },
  shield: { label: 'Escudo', aspect: 1.2, area: [0.66, 0.3, 0.08], make: (w, h) => shield(w, h) },
  drop: { label: 'Gota', aspect: 1.35, area: [0.6, 0.3, -0.08], make: (w, h) => drop(w, h) },
  moon: { label: 'Luna', aspect: 1, area: [0.36, 0.3, -0.06], make: (w, h) => moon(w, h) },
  cloud: { label: 'Nube', aspect: 0.62, area: [0.72, 0.36, -0.03], make: (w, h) => cloudShape(w, h) },
  house: { label: 'Casa', aspect: 1, area: [0.62, 0.3, -0.12], make: (w, h) => house(w, h) },
  bubble: { label: 'Globo de diálogo', aspect: 0.75, area: [0.8, 0.4, 0.08], make: (w, h) => bubble(w, h) },
  tag: { label: 'Etiqueta', aspect: 0.6, area: [0.66, 0.5, 0], make: (w, h) => tagShape(w, h) },
  flower: { label: 'Flor', aspect: 1, area: [0.5, 0.26, 0], make: (w, h) => flower(w, h) },
  clover: { label: 'Trébol', aspect: 1, area: [0.44, 0.22, 0.06], make: (w, h) => clover(w, h) },
  crown: { label: 'Corona', aspect: 0.62, area: [0.74, 0.34, -0.12], make: (w, h) => crown(w, h) },
  shirt: { label: 'Camiseta', aspect: 0.95, area: [0.52, 0.34, -0.06], make: (w, h) => shirt(w, h) },
  balloon: { label: 'Globo', aspect: 1.25, area: [0.7, 0.36, 0.08], make: (w, h) => balloonShape(w, h) },
};
/** Opciones de forma para un selector (en el orden de la lista). */
export const SHAPE_OPTIONS = Object.entries(SHAPES).map(([value, s]) => ({ value, label: s.label }));
