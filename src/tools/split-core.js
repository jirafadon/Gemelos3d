/**
 * Núcleo del separador por colores (sin pantalla, se puede probar en node).
 * - Vecindad de triángulos de una malla de manifold.
 * - Selección por varita (crece mientras la superficie no quiebra) y por pincel.
 * - Corte plano (prisma sobre el borde de la selección) o curvo (cáscara que sigue la superficie).
 * - Encastres: tetón, doble tetón o llave, con holgura por material.
 * Las dos piezas de cada corte salen de la misma herramienta de corte
 * (intersección y resta), así encastran sin huecos ni superposiciones.
 */
import { wasm } from '../engine/geom.js';

export const MATERIALS = [
  { id: 'pla', label: 'PLA', gap: 0.15 },
  { id: 'petg', label: 'PETG', gap: 0.2 },
  { id: 'abs', label: 'ABS / ASA', gap: 0.2 },
  { id: 'tpu', label: 'TPU', gap: 0.3 },
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Datos de malla para elegir: posiciones, triángulos, normales, centros y vecinos. */
export function meshInfo(solid) {
  const m = solid.getMesh();
  const n = m.numProp, P = m.vertProperties, T = m.triVerts;
  const nt = T.length / 3;
  const vp = i => [P[i * n], P[i * n + 1], P[i * n + 2]];
  const normals = new Float32Array(nt * 3), centers = new Float32Array(nt * 3), areas = new Float32Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = vp(T[t * 3]), b = vp(T[t * 3 + 1]), c = vp(T[t * 3 + 2]);
    const cr = cross(sub(b, a), sub(c, a)), l = Math.hypot(...cr) || 1e-12;
    normals.set([cr[0] / l, cr[1] / l, cr[2] / l], t * 3);
    centers.set([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3], t * 3);
    areas[t] = l / 2;
  }
  // Vecinos por arista
  const edge = new Map(), nb = new Int32Array(nt * 3).fill(-1);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = T[t * 3 + k], b = T[t * 3 + (k + 1) % 3];
    const key = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    const o = edge.get(key);
    if (o === undefined) edge.set(key, t * 3 + k);
    else { nb[t * 3 + k] = Math.floor(o / 3); nb[o] = t; }
  }
  return { n, P, T, nt, normals, centers, areas, nb, vp };
}

const nrm = (info, t) => [info.normals[t * 3], info.normals[t * 3 + 1], info.normals[t * 3 + 2]];
const ctr = (info, t) => [info.centers[t * 3], info.centers[t * 3 + 1], info.centers[t * 3 + 2]];

/**
 * Varita: desde un triángulo, suma vecinos mientras el quiebre entre caras vecinas
 * sea menor que `angle` grados (se frena en los valles y en las aristas marcadas).
 */
export function wandSelect(info, seed, angle = 28, limit = 2e6) {
  const cosA = Math.cos(angle * Math.PI / 180);
  const out = new Set([seed]), stack = [seed];
  while (stack.length && out.size < limit) {
    const t = stack.pop(), nt = nrm(info, t);
    for (let k = 0; k < 3; k++) {
      const u = info.nb[t * 3 + k];
      if (u < 0 || out.has(u)) continue;
      if (dot(nt, nrm(info, u)) >= cosA) { out.add(u); stack.push(u); }
    }
  }
  return out;
}

/** Pincel: triángulos conectados a `seed` cuyo centro está a menos de `r` mm del punto. */
export function brushSelect(info, seed, point, r) {
  const out = new Set(), stack = [seed], seen = new Set([seed]), r2 = r * r;
  while (stack.length) {
    const t = stack.pop(), c = ctr(info, t), d = sub(c, point);
    if (dot(d, d) > r2) continue;
    out.add(t);
    for (let k = 0; k < 3; k++) { const u = info.nb[t * 3 + k]; if (u >= 0 && !seen.has(u)) { seen.add(u); stack.push(u); } }
  }
  return out;
}

/** Aristas del borde de la selección (pares de índices de vértice). */
export function boundaryEdges(info, sel) {
  const out = [];
  for (const t of sel) for (let k = 0; k < 3; k++) {
    const u = info.nb[t * 3 + k];
    if (u < 0 || !sel.has(u)) out.push([info.T[t * 3 + k], info.T[t * 3 + (k + 1) % 3]]);
  }
  return out;
}

/** Borde partido en lazos cerrados, del más largo al más corto. */
export function boundaryLoops(info, edges) {
  const next = new Map();
  for (const [a, b] of edges) next.set(a, b);
  const seen = new Set(), loops = [];
  for (const [a] of edges) {
    if (seen.has(a)) continue;
    const loop = []; let v = a;
    while (v !== undefined && !seen.has(v)) { seen.add(v); loop.push(v); v = next.get(v); }
    let len = 0;
    for (let i = 0; i < loop.length; i++) { const p = info.vp(loop[i]), q = info.vp(loop[(i + 1) % loop.length]); len += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
    loops.push({ ids: loop, len });
  }
  return loops.sort((x, y) => y.len - x.len);
}

/** Plano que mejor pasa por el borde (centro + normal hacia afuera de la selección). */
export function fitPlane(info, sel) {
  const edges = boundaryEdges(info, sel);
  let sc = [0, 0, 0], sn = [0, 0, 0], sa = 0;
  for (const t of sel) { const a = info.areas[t]; sc = add(sc, mul(ctr(info, t), a)); sn = add(sn, mul(nrm(info, t), a)); sa += a; }
  sc = mul(sc, 1 / (sa || 1));
  const loops = boundaryLoops(info, edges);
  if (!loops.length) return { origin: sc, normal: norm(sn), edges, closed: true };
  // Pruebo los lazos más largos: gana el plano que deja toda la selección de un mismo lado.
  // (En una nariz, la base; en un tubo como un gorro sin tapa, el lazo de abajo.)
  const cands = [];
  for (const loop of loops.slice(0, 3)) {
    const pts = loop.ids.map(i => info.vp(i));
    if (pts.length < 3) continue;
    let c = [0, 0, 0];
    for (const p of pts) c = add(c, p);
    c = mul(c, 1 / pts.length);
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) { const d = sub(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
    let normal = smallestEigen(C);
    if (!isFinite(normal[0])) normal = norm(sn);
    let pos = 0, neg = 0;
    for (const t of sel) { const d = dot(sub(ctr(info, t), c), normal); if (d > 1e-4) pos += info.areas[t]; else if (d < -1e-4) neg += info.areas[t]; }
    if (neg > pos || (Math.abs(neg - pos) < 1e-9 && dot(normal, sn) < 0)) { normal = mul(normal, -1); [pos, neg] = [neg, pos]; }
    cands.push({ origin: c, normal: norm(normal), score: pos / (pos + neg || 1), len: loop.len });
  }
  if (!cands.length) return { origin: sc, normal: norm(sn), edges, closed: true };
  cands.sort((a, b) => (b.score - a.score > 0.02 ? 1 : a.score - b.score > 0.02 ? -1 : 0) || (Math.abs(a.len - b.len) > 0.05 * Math.max(a.len, b.len) ? b.len - a.len : a.origin[2] - b.origin[2]));
  const best = cands[0];
  return { origin: best.origin, normal: best.normal, edges, closed: false };
}

function smallestEigen(C) {
  // Autovectores de una matriz simétrica 3x3 por Jacobi
  const a = C.map(r => r.slice()), v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 50; it++) {
    let p = 0, q = 1;
    if (Math.abs(a[0][2]) > Math.abs(a[p][q])) { p = 0; q = 2; }
    if (Math.abs(a[1][2]) > Math.abs(a[p][q])) { p = 1; q = 2; }
    if (Math.abs(a[p][q]) < 1e-12) break;
    const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
    const c = 1 / Math.sqrt(t * t + 1), s = t * c;
    for (let k = 0; k < 3; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
    for (let k = 0; k < 3; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
    for (let k = 0; k < 3; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
  }
  let i = 0; if (a[1][1] < a[i][i]) i = 1; if (a[2][2] < a[i][i]) i = 2;
  return norm([v[0][i], v[1][i], v[2][i]]);
}

/** Base ortonormal del plano: u, v en el plano, n la normal. */
export function frame(normal) {
  const n = norm(normal);
  const helper = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(helper, n)), v = cross(n, u);
  return { u, v, n };
}
const toMat = (f, o) => [f.u[0], f.u[1], f.u[2], 0, f.v[0], f.v[1], f.v[2], 0, f.n[0], f.n[1], f.n[2], 0, o[0], o[1], o[2], 1];
const invMat = (f, o) => {
  // Inversa de una rotación + traslación: transpuesta y -R^T o
  const t = [-dot(f.u, o), -dot(f.v, o), -dot(f.n, o)];
  return [f.u[0], f.v[0], f.n[0], 0, f.u[1], f.v[1], f.n[1], 0, f.u[2], f.v[2], f.n[2], 0, t[0], t[1], t[2], 1];
};

/**
 * Herramienta de corte plano: el contorno de la selección proyectado al plano y estirado hacia afuera.
 * @param depth cuánto se mete el plano adentro de la pieza (mm, positivo = más hondo)
 * @param margin agranda un poco el contorno para tomar el borde entero
 */
export function planeCutter(info, sel, plane, { depth = 0, margin = 0.6 } = {}) {
  const { CrossSection } = wasm();
  const f = frame(plane.normal), o = sub(plane.origin, mul(f.n, depth));
  const polys = [];
  let hMax = 0;
  for (const t of sel) {
    const tri = [0, 1, 2].map(k => info.vp(info.T[t * 3 + k]));
    const q = tri.map(p => { const d = sub(p, o); return [dot(d, f.u), dot(d, f.v), dot(d, f.n)]; });
    for (const p of q) hMax = Math.max(hMax, p[2]);
    const area = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]);
    if (Math.abs(area) < 1e-9) continue;
    polys.push(area > 0 ? q.map(p => [p[0], p[1]]) : [q[0], q[2], q[1]].map(p => [p[0], p[1]]));
  }
  if (!polys.length) return null;
  let foot = new CrossSection(polys, 'Positive');
  foot = foot.offset(margin, 'Round', 2, 16).simplify(0.02);
  // Sin agujeros: si elegiste el costado de un gorro, el corte toma el gorro entero
  const area = poly => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  const outer = foot.toPolygons().filter(p => area(p) > 0);
  if (outer.length) foot = new CrossSection(outer, 'Positive');
  const H = hMax + depth + 2;
  if (foot.isEmpty() || H <= 0) return null;
  const local = foot.extrude(H);
  return { tool: local.transform(toMat(f, o)), foot, frame: f, origin: o, H };
}

/**
 * Herramienta de corte curvo: una cáscara que copia la superficie elegida,
 * de `thick` mm hacia adentro (y un poco hacia afuera para tomarla entera).
 */
export function skinCutter(info, sel, thick = 1.6) {
  const { Manifold, Mesh } = wasm();
  // Normales por vértice (promedio pesado por área de las caras elegidas)
  const vn = new Map();
  for (const t of sel) {
    const n = mul(nrm(info, t), info.areas[t]);
    for (let k = 0; k < 3; k++) { const v = info.T[t * 3 + k]; const s = vn.get(v); vn.set(v, s ? add(s, n) : n); }
  }
  const ids = [...vn.keys()], index = new Map(ids.map((v, i) => [v, i]));
  const N = ids.length, verts = new Float32Array(N * 2 * 3);
  const out = 0.6;
  ids.forEach((v, i) => {
    const p = info.vp(v), n = norm(vn.get(v));
    verts.set(add(p, mul(n, out)), i * 3);
    verts.set(sub(p, mul(n, thick)), (N + i) * 3);
  });
  const tris = [];
  for (const t of sel) {
    const a = index.get(info.T[t * 3]), b = index.get(info.T[t * 3 + 1]), c = index.get(info.T[t * 3 + 2]);
    tris.push(a, b, c, N + a, N + c, N + b);
  }
  for (const [p, q] of boundaryEdges(info, sel)) {
    const a = index.get(p), b = index.get(q);
    tris.push(b, a, N + a, b, N + a, N + b);
  }
  const mesh = new Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) });
  const tool = new Manifold(mesh);
  if (tool.status() !== 'NoError' || tool.isEmpty()) return null;
  return { tool };
}

/**
 * Corte recto por un plano perpendicular a X, Y o Z (para piezas que no entran en la cama).
 * @param frac  posición del corte entre 0 (mínimo) y 1 (máximo) de la pieza en ese eje
 */
export function axisCutter(solid, axis = 2, frac = 0.5) {
  const { CrossSection } = wasm();
  const b = solid.boundingBox();
  const n = [0, 0, 0]; n[axis] = 1;
  const c = [0, 1, 2].map(i => (b.min[i] + b.max[i]) / 2);
  c[axis] = b.min[axis] + (b.max[axis] - b.min[axis]) * Math.min(0.98, Math.max(0.02, frac));
  const f = frame(n);
  const span = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 2 + 20;
  const foot = CrossSection.square([span, span], true);
  const H = span;
  return { tool: foot.extrude(H).transform(toMat(f, c)), foot, frame: f, origin: c, H };
}

/** Saca astillas de volumen cero que a veces dejan las operaciones. */
export function clean(solid) {
  const { Manifold } = wasm();
  const bodies = solid.decompose();
  if (bodies.length < 2) return solid;
  const keep = bodies.filter(b => b.volume() > 0.005);
  return keep.length === bodies.length ? solid : (keep.length ? Manifold.compose(keep) : solid);
}

/** Corta `solid` con la herramienta: [lo de adentro, el resto]. */
export function applyCut(solid, tool) {
  return { inside: clean(solid.intersect(tool)), rest: clean(solid.subtract(tool)) };
}

/** Centro "más adentro" de una sección 2D y cuánto lugar hay (radio libre). */
function innerPoint(cs) {
  if (cs.isEmpty()) return null;
  let lo = 0, hi = 0;
  const b = cs.bounds();
  hi = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 2;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (cs.offset(-mid, 'Round', 2, 12).isEmpty()) hi = mid; else lo = mid; }
  const core = cs.offset(-lo * 0.85, 'Round', 2, 12);
  const largest = core.decompose().sort((a, b) => b.area() - a.area())[0] || core;
  const bb = largest.bounds();
  let c = [(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2];
  // Si el centro de la caja cae afuera, uso un punto del núcleo
  const probe = wasm().CrossSection.circle(0.05, 8).translate(c);
  if (largest.intersect(probe).isEmpty()) { const poly = largest.toPolygons()[0]; c = poly[0]; }
  return { c, r: lo, cs };
}

/**
 * Encastre entre la pieza nueva (`inside`) y el resto, para un corte plano.
 * kind: 'peg' | 'double' | 'key'. El tetón sale de la pieza y entra en un agujero del resto.
 * @returns { inside, rest, note } con las piezas ya modificadas, o note con el motivo si no entró.
 */
export function addJoint(inside, rest, cut, { kind = 'peg', gap = 0.15, size = 0 } = {}) {
  const { Manifold, CrossSection } = wasm();
  if (!cut || !cut.frame) return { inside, rest, note: 'Los encastres van con el corte plano.' };
  const M = toMat(cut.frame, cut.origin), Mi = invMat(cut.frame, cut.origin);
  // Sección del corte en el plano (coordenadas locales)
  const local = inside.add(rest).transform(Mi);
  const sec = local.slice(0.02).intersect(cut.foot);
  const ip = innerPoint(sec);
  if (!ip || ip.r < 1.4) return { inside, rest, note: 'La cara del corte es muy chica para un encastre.' };
  const r = size > 0 ? size / 2 : Math.min(3, Math.max(1, ip.r * 0.45));
  // Cuánto se puede hundir: el resto tiene que tener material debajo
  const restL = rest.transform(Mi);
  let L = Math.min(8, r * 2.4);
  const centers = [];
  if (kind === 'double') {
    // Dos tetones sobre el eje más largo de la sección
    const pts = sec.toPolygons().flat();
    let best = [ip.c, ip.c], bd = 0;
    for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 60))) for (let j = i + 1; j < pts.length; j += Math.max(1, Math.floor(pts.length / 60))) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d > bd) { bd = d; best = [pts[i], pts[j]]; }
    }
    const dir = norm([best[1][0] - best[0][0], best[1][1] - best[0][1], 0]);
    const core = sec.offset(-(r + gap + 0.8), 'Round', 2, 12);
    for (const s of [-1, 1]) {
      let k = bd * 0.3;
      for (; k > 0; k -= 0.5) {
        const c = [ip.c[0] + dir[0] * k * s, ip.c[1] + dir[1] * k * s];
        if (!core.intersect(CrossSection.circle(0.05, 8).translate(c)).isEmpty()) { centers.push(c); break; }
      }
    }
    if (centers.length < 2) centers.splice(0, centers.length, ip.c);
  } else centers.push(ip.c);

  const shape = (rad) => kind === 'key' ? CrossSection.square([rad * 1.8, rad * 1.8], true).offset(rad * 0.1, 'Round', 2, 8) : CrossSection.circle(rad, 32);
  for (let tries = 0; tries < 4; tries++, L *= 0.7) {
    let pin = null, hole = null;
    for (const c of centers) {
      const p = shape(r).translate(c).extrude(L + 0.02).translate([0, 0, -L]);
      const h = shape(r + gap).translate(c).extrude(L + gap + 0.4).translate([0, 0, -L - gap - 0.4]);
      pin = pin ? pin.add(p) : p; hole = hole ? hole.add(h) : h;
    }
    // El agujero tiene que quedar adentro del resto, con al menos 0,8 mm de pared alrededor y abajo
    const wall = hole.transform(M);
    let guard = null;
    for (const c of centers) { const g = shape(r + gap + 0.8).translate(c).extrude(L + gap + 1.2).translate([0, 0, -L - gap - 1.2]); guard = guard ? guard.add(g) : g; }
    const guardW = guard.transform(M);
    if (guardW.subtract(rest).volume() < guardW.volume() * 0.01) {
      const pinW = pin.transform(M);
      const newInside = clean(inside.add(pinW));
      const newRest = clean(rest.subtract(wall));
      return { inside: newInside, rest: newRest, note: '', info: { r, L, count: centers.length } };
    }
  }
  return { inside, rest, note: 'No hay lugar para el encastre de ese lado: probá un corte más hondo o sin encastre.' };
}

/** Revisión de cada pieza: cerrada, cuántos cuerpos y volumen. */
export function checkPart(solid) {
  const ok = solid.status() === 'NoError' && !solid.isEmpty();
  return { ok, volume: ok ? solid.volume() : 0, bodies: ok ? solid.decompose().filter(b => b.volume() > 0.005).length : 0, tris: ok ? solid.numTri() : 0 };
}

/** Modelo de ejemplo propio: muñeco de nieve con nariz, gorro y botones, todo en una pieza. */
export function sampleModel() {
  const { Manifold } = wasm();
  const body = Manifold.sphere(22, 96).scale([1, 1, 0.92]).translate([0, 0, 20]);
  const head = Manifold.sphere(15, 80).translate([0, 0, 52]);
  const nose = Manifold.cylinder(14, 3.4, 0.6, 32).rotate([90, 0, 0]).translate([0, -12, 53]);
  const brim = Manifold.cylinder(2.4, 17, 17, 80).translate([0, 0, 62]);
  const hat = Manifold.cylinder(16, 11, 10, 80).translate([0, 0, 63]);
  const buttons = [24, 32].map(z => Manifold.sphere(2.6, 24).translate([0, -Math.sqrt(Math.max(0, 22 * 22 - (z - 20) ** 2 / 0.85)) + 0.6, z]));
  let m = Manifold.union([body, head, nose, brim, hat, ...buttons]);
  return m.subtract(Manifold.cube([200, 200, 10], true).translate([0, 0, -5 + 2])).translate([0, 0, -2]);
}
