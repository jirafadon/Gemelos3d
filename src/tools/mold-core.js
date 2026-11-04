/**
 * Núcleo de moldes (se puede probar en node).
 * - Molde rígido de dos mitades: bloque con la pieza hueca adentro, partido a una altura,
 *   con llaves de registro (semiesferas que encastran), bebedero para colar y respiraderos.
 *   Para resina, yeso, jabón, chocolate (con PETG o con un sellado apto) o cera.
 * - Caja para colar silicona: cuatro paredes que se traban y una base con la pieza apoyada,
 *   para hacer un molde de silicona de una pieza.
 */
import { wasm } from '../engine/geom.js';

const box = (min, max) => wasm().Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]], false).translate(min);

/**
 * @param model   sólido de la pieza (ya ubicado)
 * @param opts.wall   pared alrededor de la pieza (mm)
 * @param opts.split  altura del corte, 0..1 de la pieza
 * @param opts.keyR   radio de las llaves de registro
 * @param opts.gap    holgura de las llaves
 * @param opts.pour   diámetro del bebedero (0 = sin)
 * @param opts.vents  cantidad de respiraderos
 */
export function twoPartMold(model, { wall = 8, split = 0.5, keyR = 3.5, gap = 0.2, pour = 8, vents = 2 } = {}) {
  const { Manifold } = wasm();
  const b = model.boundingBox();
  const min = [b.min[0] - wall, b.min[1] - wall, b.min[2] - wall], max = [b.max[0] + wall, b.max[1] + wall, b.max[2] + wall];
  const zs = b.min[2] + (b.max[2] - b.min[2]) * Math.min(0.95, Math.max(0.05, split));
  let lower = box(min, [max[0], max[1], zs]).subtract(model);
  let upper = box([min[0], min[1], zs], max).subtract(model);
  // Llaves en las cuatro esquinas: semiesferas en la de abajo y huecos en la de arriba
  const inset = wall * 0.5 + keyR * 0.2;
  const corners = [[min[0] + inset, min[1] + inset], [max[0] - inset, min[1] + inset], [max[0] - inset, max[1] - inset], [min[0] + inset, max[1] - inset]];
  const r = Math.min(keyR, wall * 0.42);
  // Se meten un pelito en la de abajo para quedar unidas a ella
  const bumps = Manifold.union(corners.map(([x, y]) => Manifold.sphere(r, 32).translate([x, y, zs]))).intersect(box([min[0], min[1], zs - 0.3], max));
  const sockets = Manifold.union(corners.map(([x, y]) => Manifold.sphere(r + gap, 32).translate([x, y, zs])));
  lower = lower.add(bumps);
  upper = upper.subtract(sockets);
  // Bebedero: desde lo más alto de la pieza hasta arriba, con un embudo
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  const notes = [];
  if (pour > 0) {
    const top = topPointNear(model, cx, cy);
    const ch = max[2] - top[2] + 1;
    const channel = Manifold.cylinder(ch, pour / 2, pour / 2, 32).translate([top[0], top[1], top[2] - 0.5]);
    const funnel = Manifold.cylinder(Math.min(6, wall), pour / 2, pour, 32).translate([top[0], top[1], max[2] - Math.min(6, wall) + 0.01]);
    upper = upper.subtract(channel).subtract(funnel);
    notes.push(`Bebedero de ${pour} mm arriba de la pieza.`);
  }
  // Respiraderos: finitos, desde los otros puntos altos
  if (vents > 0) {
    const pts = highPoints(model, vents + 1).slice(1, vents + 1);
    for (const p of pts) upper = upper.subtract(Manifold.cylinder(max[2] - p[2] + 1, 1, 1, 16).translate([p[0], p[1], p[2] - 0.3]));
  }
  // La de arriba se da vuelta: las dos quedan con la cara del corte hacia arriba (el hueco como un cuenco)
  const w = max[0] - min[0];
  const upperPrint = upper.rotate([180, 0, 0]).translate([w + 10, (min[1] + max[1]), zs + (max[2] - zs) - (max[2] - zs)]);
  const ub = upperPrint.boundingBox();
  return { lower: lower.translate([0, 0, -min[2]]), upper: upperPrint.translate([0, 0, -ub.min[2]]), upperInPlace: upper, zs, notes };
}

/** Punto más alto de la pieza cerca de (x, y). */
function topPointNear(model, x, y) {
  const m = model.getMesh(), n = m.numProp, P = m.vertProperties;
  let best = null, score = -Infinity;
  for (let i = 0; i < P.length; i += n) {
    const s = P[i + 2] - 0.15 * Math.hypot(P[i] - x, P[i + 1] - y);
    if (s > score) { score = s; best = [P[i], P[i + 1], P[i + 2]]; }
  }
  return best;
}

/** Varios puntos altos y separados entre sí (para respiraderos). */
function highPoints(model, k) {
  const m = model.getMesh(), n = m.numProp, P = m.vertProperties, list = [];
  for (let i = 0; i < P.length; i += n) list.push([P[i], P[i + 1], P[i + 2]]);
  list.sort((a, b) => b[2] - a[2]);
  const b = model.boundingBox(), minD = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]) * 0.25;
  const out = [];
  for (const p of list) { if (out.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > minD)) out.push(p); if (out.length >= k) break; }
  return out;
}

/**
 * Caja para colar silicona: base con la pieza apoyada (y un borde donde calzan las paredes)
 * y cuatro paredes acostadas que se paran en el canal de la base.
 */
export function siliconeBox(model, { margin = 10, wallT = 3, over = 8, gap = 0.3 } = {}) {
  const { Manifold } = wasm();
  const b = model.boundingBox();
  const W = b.max[0] - b.min[0] + 2 * margin, D = b.max[1] - b.min[1] + 2 * margin, H = b.max[2] - b.min[2] + over;
  const baseT = 3;
  // Base: placa con canal donde calzan las paredes
  let base = Manifold.cube([W + 2 * wallT + 8, D + 2 * wallT + 8, baseT], true).translate([0, 0, baseT / 2]);
  const groove = Manifold.cube([W + 2 * wallT + 2 * gap, D + 2 * wallT + 2 * gap, 2], true).subtract(Manifold.cube([W - 2 * gap, D - 2 * gap, 3], true)).translate([0, 0, baseT - 0.99 + 1]);
  base = base.subtract(groove);
  // La pieza se apoya en la base (centrada)
  const c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
  const placed = model.translate([-c[0], -c[1], baseT - b.min[2]]);
  // Paredes: dos largas y dos cortas que entran en el canal de la base (se sujetan con una gomita o cinta)
  const long = Manifold.cube([W + 2 * wallT, H + 2, wallT], false);
  const short = Manifold.cube([D, H + 2, wallT], false);
  const laid = [long, long, short, short].map((w, i) => w.translate([W / 2 + wallT + 14, -((D + 2 * wallT + 8) / 2) + i * (H + 8), 0]));
  return { base, model: placed, walls: laid, inner: [W, D, H] };
}
