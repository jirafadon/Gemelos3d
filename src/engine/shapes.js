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

export const SHAPES = {
  rect: { label: 'Rectángulo', make: (w, h, r = 3) => roundedRect(w, h, r) },
  oval: { label: 'Óvalo', make: (w, h) => ellipse(w, h) },
  wavy: { label: 'Óvalo ondulado', make: (w, h) => wavyOval(w, h) },
  circle: { label: 'Círculo', make: (w) => circle(w / 2, 96) },
  heart: { label: 'Corazón', make: (w, h) => heart(w, h) },
  bone: { label: 'Hueso', make: (w, h) => bone(w, h) },
  fish: { label: 'Pez', make: (w, h) => fish(w, h) },
  star: { label: 'Estrella', make: (w) => star(w) },
  paw: { label: 'Huella', make: (w) => paw(w) },
};
