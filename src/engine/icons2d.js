/**
 * Íconos 2D propios para premios y souvenirs (todos centrados, en mm).
 * Dibujos simples y genéricos, hechos acá: birrete, laurel, pelota, diploma,
 * nube, globo y chupete.
 */
import { wasm, circle, ellipse, roundedRect, polygonShape } from './geom.js';
import { smooth } from './shapes.js';

/** Birrete de graduación (visto de frente), con borla. Ancho w. */
export function birrete(w) {
  const { CrossSection } = wasm();
  const h = w * 0.62;
  const board = polygonShape([[-w / 2, h * 0.62], [0, h * 0.86], [w / 2, h * 0.62], [0, h * 0.4]]);
  const cap = polygonShape([[-w * 0.3, h * 0.5], [w * 0.3, h * 0.5], [w * 0.27, h * 0.14], [-w * 0.27, h * 0.14]])
    .add(ellipse(w * 0.54, h * 0.14).translate([0, h * 0.14]));
  const cord = CrossSection.square([w * 0.025, h * 0.38], false).translate([w * 0.33, h * 0.24]);
  const tassel = polygonShape([[w * 0.31, h * 0.25], [w * 0.38, h * 0.25], [w * 0.4, h * 0.02], [w * 0.29, h * 0.02]]);
  const knot = circle(w * 0.04, 24).translate([0, h * 0.63]);
  const top = CrossSection.square([w * 0.33, w * 0.022], false).translate([0, h * 0.63 - w * 0.011]);
  const s = CrossSection.union([board, cap, cord, tassel, knot, top]);
  const b = s.bounds();
  return s.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
}

/** Corona de laurel: dos ramas de hojas en arco, abiertas arriba. Radio r. */
export function laurel(r, leaves = 9) {
  const { CrossSection } = wasm();
  const parts = [];
  const leafL = r * 0.36, leafW = leafL * 0.42;
  for (const side of [-1, 1]) {
    for (let i = 0; i < leaves; i++) {
      const t = i / (leaves - 1);
      const a = (-90 + t * 150) * Math.PI / 180; // de abajo hacia arriba
      const ang = side > 0 ? a : Math.PI - a;
      const x = r * Math.cos(ang), y = r * Math.sin(ang);
      const tangent = (ang * 180 / Math.PI) + (side > 0 ? 90 : -90);
      const leaf = ellipse(leafL, leafW, 32).translate([leafL * 0.35, 0]).rotate(tangent + side * 28);
      parts.push(leaf.translate([x, y]));
    }
    // tallo
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = (-92 + t * 150) * Math.PI / 180, ang = side > 0 ? a : Math.PI - a; pts.push([r * 0.97 * Math.cos(ang), r * 0.97 * Math.sin(ang)]); }
    for (let i = 40; i >= 0; i--) { const t = i / 40, a = (-92 + t * 150) * Math.PI / 180, ang = side > 0 ? a : Math.PI - a; pts.push([r * 1.03 * Math.cos(ang), r * 1.03 * Math.sin(ang)]); }
    parts.push(polygonShape(pts));
  }
  return CrossSection.union(parts);
}

/** Pelota de fútbol (pentágono al centro y costuras). Diámetro d. */
export function ball(d) {
  const { CrossSection } = wasm();
  const r = d / 2, line = Math.max(0.8, d * 0.04);
  let s = circle(r, 96).subtract(circle(r - line, 96));
  const pent = n => { const p = []; for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 5; p.push([n * Math.cos(a), n * Math.sin(a)]); } return polygonShape(p); };
  s = s.add(pent(r * 0.32));
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / 5;
    const seam = CrossSection.square([line, r * 0.68], false).translate([-line / 2, r * 0.3]).rotate(a * 180 / Math.PI - 90);
    s = s.add(seam);
    s = s.add(pent(r * 0.2).rotate(36).translate([r * 0.86 * Math.cos(a + Math.PI / 5), r * 0.86 * Math.sin(a + Math.PI / 5)]).intersect(circle(r, 96)));
  }
  return s;
}

/** Diploma enrollado con moño. Ancho w. */
export function diploma(w) {
  const h = w * 0.34;
  const roll = roundedRect(w, h * 0.55, h * 0.27).rotate(-18);
  const ends = [-1, 1].map(k => ellipse(h * 0.32, h * 0.6).translate([k * w * 0.48, 0]).rotate(-18));
  const bow = polygonShape([[0, 0], [-h * 0.5, h * 0.35], [-h * 0.5, -h * 0.35]]).add(polygonShape([[0, 0], [h * 0.5, h * 0.35], [h * 0.5, -h * 0.35]]))
    .add(polygonShape([[0, 0], [-h * 0.25, -h * 0.9], [-h * 0.05, -h * 0.9]])).add(polygonShape([[0, 0], [h * 0.25, -h * 0.9], [h * 0.05, -h * 0.9]]));
  return wasm().CrossSection.union([roll, ...ends, bow.translate([w * 0.05, -h * 0.05])]);
}

/** Nube de ancho w. */
export function cloud(w) {
  const r = w / 5;
  const s = wasm().CrossSection.union([circle(r * 1.2, 64).translate([-w * 0.25, 0]), circle(r * 1.6, 64).translate([0, r * 0.5]), circle(r * 1.3, 64).translate([w * 0.26, r * 0.1]), roundedRect(w * 0.9, r * 1.6, r * 0.8).translate([0, -r * 0.4])]);
  const b = s.bounds();
  return smooth(s.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]), w * 0.02);
}

/** Globo con nudo. Ancho w. */
export function balloon(w) {
  const body = ellipse(w, w * 1.2).translate([0, w * 0.1]);
  const knot = polygonShape([[0, -w * 0.48], [w * 0.09, -w * 0.62], [-w * 0.09, -w * 0.62]]);
  return body.add(knot);
}

/** Chupete de bebé. Ancho w. */
export function pacifier(w) {
  const { CrossSection } = wasm();
  const shield = ellipse(w, w * 0.62);
  const ringOuter = circle(w * 0.26, 48).subtract(circle(w * 0.17, 48)).translate([0, w * 0.4]);
  const nub = circle(w * 0.14, 32).translate([0, 0]);
  return CrossSection.union([shield, ringOuter]).subtract(circle(w * 0.07, 24).translate([-w * 0.3, 0])).subtract(circle(w * 0.07, 24).translate([w * 0.3, 0])).add(nub);
}

export const ICONS = {
  none: { label: 'Ninguno' },
  star: { label: 'Estrella' },
  heart: { label: 'Corazón' },
  birrete: { label: 'Birrete', make: w => birrete(w) },
  ball: { label: 'Pelota', make: w => ball(w) },
  diploma: { label: 'Diploma', make: w => diploma(w) },
  laurel: { label: 'Laurel', make: w => laurel(w / 2.4) },
};
