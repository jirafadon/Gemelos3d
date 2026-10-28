/**
 * Objetos del Taller 3D (estilo Tinkercad) y cómo se convierten en sólidos.
 *
 * Convenciones:
 * - x, y = centro de la caja que ocupa el objeto ya rotado; z = altura de su base.
 * - w, d, h = tamaño del objeto en sus propios ejes (antes de rotar).
 * - Un grupo guarda a sus hijos en coordenadas locales; sus huecos restan solo dentro del grupo.
 * - Los huecos sueltos (fuera de grupos) restan a todo lo que tocan.
 *
 * Este módulo no depende del navegador: se prueba en Node.
 */
import { wasm, textShape, slab, polygonShape } from '../engine/geom.js';
import { track } from '../engine/gc.js';
import { fitInto, star as starShape, heart as heartShape } from '../engine/shapes.js';
import { maskToShape, sampleMask } from '../engine/trace.js';

export const TYPES = {
  box: { label: 'Caja', size: [20, 20, 20], cat: 'basic' },
  cylinder: { label: 'Cilindro', size: [20, 20, 20], cat: 'basic' },
  sphere: { label: 'Esfera', size: [20, 20, 20], cat: 'basic' },
  cone: { label: 'Cono', size: [20, 20, 20], cat: 'basic' },
  roof: { label: 'Techo', size: [20, 20, 20], cat: 'basic' },
  pyramid: { label: 'Pirámide', size: [20, 20, 20], cat: 'basic' },
  halfsphere: { label: 'Media esfera', size: [20, 20, 10], cat: 'basic' },
  wedge: { label: 'Cuña', size: [20, 20, 20], cat: 'basic' },
  tube: { label: 'Tubo', size: [20, 20, 20], cat: 'basic' },
  torus: { label: 'Toroide', size: [20, 20, 4], cat: 'basic' },
  polygon: { label: 'Polígono', size: [20, 20, 10], cat: 'basic' },
  star: { label: 'Estrella', size: [20, 20, 6], cat: 'basic' },
  heart: { label: 'Corazón', size: [20, 18, 6], cat: 'basic' },
  paraboloid: { label: 'Paraboloide', size: [20, 20, 20], cat: 'basic' },
  text: { label: 'Texto', size: [40, 12, 4], cat: 'text' },
  image: { label: 'Imagen', size: [40, 40, 3], cat: 'import' },
  stl: { label: 'Malla', size: [20, 20, 20], cat: 'import' },
  group: { label: 'Grupo', size: [20, 20, 20], cat: 'none' },
};

/** Parámetros propios de cada forma (además de tamaño, posición y rotación). */
export const SHAPE_PARAMS = {
  box: [{ key: 'radius', label: 'Redondeo de bordes', default: 0, min: 0, max: 50, step: 0.5, unit: 'mm' }],
  cylinder: [{ key: 'sides', label: 'Lados', default: 64, min: 3, max: 128, step: 1, unit: '' }],
  cone: [{ key: 'top', label: 'Radio de la punta', default: 0, min: 0, max: 1, step: 0.05, unit: '×' }, { key: 'sides', label: 'Lados', default: 64, min: 3, max: 128, step: 1, unit: '' }],
  sphere: [{ key: 'sides', label: 'Suavidad', default: 48, min: 8, max: 96, step: 2, unit: '' }],
  halfsphere: [{ key: 'sides', label: 'Suavidad', default: 48, min: 8, max: 96, step: 2, unit: '' }],
  tube: [{ key: 'wall', label: 'Pared', default: 2, min: 0.4, max: 50, step: 0.2, unit: 'mm' }, { key: 'sides', label: 'Lados', default: 64, min: 3, max: 128, step: 1, unit: '' }],
  torus: [{ key: 'sides', label: 'Suavidad', default: 48, min: 8, max: 96, step: 2, unit: '' }],
  polygon: [{ key: 'sides', label: 'Lados', default: 6, min: 3, max: 24, step: 1, unit: '' }],
  star: [{ key: 'points', label: 'Puntas', default: 5, min: 3, max: 16, step: 1, unit: '' }, { key: 'inner', label: 'Radio interno', default: 0.45, min: 0.15, max: 0.9, step: 0.01, unit: '×' }],
};

const PALETTE = ['#1D4ED8', '#D62828', '#2A9D8F', '#F77F00', '#7B2CBF', '#FCBF49', '#F72585', '#8AC926'];
let seq = 0;
export const newId = () => `o${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeObject(type, index = 0, extra = {}) {
  const [w, d, h] = TYPES[type].size;
  const o = {
    id: newId(), type, name: `${TYPES[type].label} ${index + 1}`,
    x: 0, y: 0, z: 0, w, d, h, rx: 0, ry: 0, rz: 0,
    color: PALETTE[index % PALETTE.length], hole: false, hidden: false, locked: false,
    mirror: [false, false, false],
  };
  for (const p of SHAPE_PARAMS[type] || []) o[p.key] = p.default;
  if (type === 'text') Object.assign(o, { text: 'Hola', font: 'baloo' });
  if (type === 'image') Object.assign(o, { image: '', threshold: 128, invert: false });
  return Object.assign(o, extra);
}

/** Copia profunda que comparte las mallas (para no duplicar memoria). */
export function cloneObj(o, fresh = false) {
  const c = { ...o, mirror: [...(o.mirror || [false, false, false])] };
  if (o.children) c.children = o.children.map(ch => cloneObj(ch, fresh));
  if (fresh) c.id = newId();
  return c;
}

// ---------------- Formas ----------------

function centered(m) {
  const b = m.boundingBox();
  return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -(b.min[2] + b.max[2]) / 2]);
}
/** Lleva un sólido a medir exactamente w × d × h, centrado. */
function fitBox(m, w, d, h) {
  const b = m.boundingBox();
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  return centered(m).scale([w / (sx || 1), d / (sy || 1), h / (sz || 1)]);
}
const prism = (cs, w, d, h) => fitBox(cs.extrude(1), w, d, h);

async function shapeSolid(o, ctx) {
  const { Manifold, CrossSection } = wasm();
  const w = Math.max(0.1, o.w), d = Math.max(0.1, o.d), h = Math.max(0.1, o.h);
  const sides = Math.round(o.sides || 64);
  switch (o.type) {
    case 'box': {
      const r = Math.min(o.radius || 0, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01);
      if (r <= 0.01) return Manifold.cube([w, d, h], true);
      const spheres = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) spheres.push(Manifold.sphere(r, 24).translate([sx * (w / 2 - r), sy * (d / 2 - r), sz * (h / 2 - r)]));
      return Manifold.hull(spheres);
    }
    case 'cylinder': return fitBox(Manifold.cylinder(1, 0.5, 0.5, sides, true), w, d, h);
    case 'polygon': return fitBox(Manifold.cylinder(1, 0.5, 0.5, Math.max(3, Math.round(o.sides || 6)), true).rotate([0, 0, 90]), w, d, h);
    case 'cone': {
      const top = Math.max(0, Math.min(1, o.top || 0)) * 0.5;
      return fitBox(Manifold.cylinder(1, 0.5, top, sides, true), w, d, h);
    }
    case 'sphere': return Manifold.sphere(0.5, Math.round(o.sides || 48)).scale([w, d, h]);
    case 'halfsphere': return fitBox(Manifold.sphere(0.5, Math.round(o.sides || 48)).trimByPlane([0, 0, 1], 0), w, d, h);
    case 'pyramid': return fitBox(Manifold.cylinder(1, Math.SQRT1_2, 0, 4).rotate([0, 0, 45]), w, d, h);
    case 'roof': {
      const tri = track(new CrossSection([[[-0.5, 0], [0.5, 0], [0, 1]]], 'NonZero'));
      return fitBox(tri.extrude(1).rotate([90, 0, 0]), w, d, h);
    }
    case 'wedge': {
      const tri = track(new CrossSection([[[-0.5, 0], [0.5, 0], [-0.5, 1]]], 'NonZero'));
      return fitBox(tri.extrude(1).rotate([90, 0, 0]), w, d, h);
    }
    case 'tube': {
      const t = Math.min(o.wall || 2, w / 2 - 0.2, d / 2 - 0.2);
      const outer = fitBox(Manifold.cylinder(1, 0.5, 0.5, sides, true), w, d, h);
      const inner = fitBox(Manifold.cylinder(1, 0.5, 0.5, sides, true), Math.max(0.1, w - 2 * t), Math.max(0.1, d - 2 * t), h + 2);
      return outer.subtract(inner);
    }
    case 'torus': {
      const tube = Math.min(h, w / 2 - 0.1);
      const ring = CrossSection.circle(tube / 2, 32).translate([w / 2 - tube / 2, 0]);
      return fitBox(Manifold.revolve(ring, Math.round(o.sides || 48)), w, d, h);
    }
    case 'paraboloid': {
      const pts = [[0, 0]];
      for (let i = 0; i <= 24; i++) { const r = 1 - i / 24; pts.push([r, 1 - r * r]); }
      return fitBox(Manifold.revolve(polygonShape(pts), 64), w, d, h);
    }
    case 'star': return prism(starShape(2, Math.round(o.points || 5), o.inner || 0.45, 0), w, d, h);
    case 'heart': return prism(heartShape(2, 1.8), w, d, h);
    case 'text': {
      const font = await ctx.font(o.font || 'baloo');
      return slab(fitInto(textShape(font, o.text || ' ', { height: d }), w, d), h).translate([0, 0, -h / 2]);
    }
    case 'image': {
      const mask = o.image && ctx.image ? await ctx.image(o.image, { threshold: o.threshold ?? 128, invert: !!o.invert, maxPx: 320 }) : sampleMask();
      return slab(fitInto(maskToShape(mask, { width: 100, smooth: 0.4 }), w, d), h).translate([0, 0, -h / 2]);
    }
    case 'stl': {
      if (!o.mesh) return Manifold.cube([w, d, h], true);
      return fitBox(meshToManifold(o.mesh), w, d, h);
    }
    default: throw new Error(`Tipo desconocido: ${o.type}`);
  }
}

// ---------------- Piezas de un objeto ----------------

/** Resuelve superposiciones entre colores: lo agregado después se queda con el volumen compartido. */
function resolveColors(entries, holes) {
  const { Manifold } = wasm();
  const byColor = new Map();
  for (const e of entries) byColor.set(e.color, [...(byColor.get(e.color) || []), e.solid]);
  const holeAll = holes.length ? Manifold.union(holes) : null;
  const out = new Map();
  let claimed = null;
  for (const color of [...byColor.keys()].reverse()) {
    let s = Manifold.union(byColor.get(color));
    if (holeAll) s = s.subtract(holeAll);
    if (claimed) s = s.subtract(claimed);
    claimed = claimed ? claimed.add(s) : s;
    out.set(color, s);
  }
  return [...byColor.keys()].map(color => ({ color, solid: out.get(color) })).filter(p => !p.solid.isEmpty());
}

/**
 * Piezas del objeto centradas en el origen y sin rotar (con espejo y escala aplicados).
 * @returns [{ color, solid, hole }]
 */
/** Resultado de un grupo en sus coordenadas locales (sin centrar ni escalar). */
export async function groupLocal(o, ctx) {
  const { Manifold } = wasm();
  const placed = [];
  for (const ch of o.children || []) {
    if (ch.hidden) continue;
    placed.push(...(await objectParts(ch, ctx)).parts);
  }
  const holes = placed.filter(p => p.hole).map(p => p.solid);
  const solids = placed.filter(p => !p.hole);
  if (!solids.length) return { parts: [], box: null };
  let parts;
  if (o.hole) {
    let u = Manifold.union(solids.map(p => p.solid));
    if (holes.length) u = u.subtract(Manifold.union(holes));
    parts = [{ color: o.color, hole: true, solid: u }];
  } else if (o.multicolor !== false) {
    parts = resolveColors(solids, holes).map(p => ({ ...p, hole: false }));
  } else {
    let u = Manifold.union(solids.map(p => p.solid));
    if (holes.length) u = u.subtract(Manifold.union(holes));
    parts = [{ color: o.color, hole: false, solid: u }];
  }
  parts = parts.filter(p => !p.solid.isEmpty());
  return { parts, box: parts.length ? partsBox(parts) : null };
}

/**
 * Piezas del objeto centradas en el origen y sin rotar (con espejo y escala aplicados).
 * @returns [{ color, solid, hole }]
 */
export async function objectRaw(o, ctx) {
  let parts;
  if (o.type === 'group') {
    const local = await groupLocal(o, ctx);
    if (!local.box) return [];
    const { center: c, size } = local.box;
    const s = [o.w / (size[0] || 1), o.d / (size[1] || 1), o.h / (size[2] || 1)];
    parts = local.parts.map(p => ({ ...p, solid: p.solid.translate(c.map(v => -v)).scale(s) }));
  } else {
    parts = [{ color: o.color, hole: !!o.hole, solid: await shapeSolid(o, ctx) }];
  }
  const m = o.mirror || [];
  if (m[0] || m[1] || m[2]) parts = parts.map(p => ({ ...p, solid: p.solid.scale([m[0] ? -1 : 1, m[1] ? -1 : 1, m[2] ? -1 : 1]) }));
  return parts;
}

/**
 * Piezas del objeto en su lugar del mundo.
 * @returns { parts, raw, pivot } pivot = dónde quedó el centro del objeto sin rotar
 */
export async function objectParts(o, ctx) {
  const { Manifold } = wasm();
  const raw = await objectRaw(o, ctx);
  if (!raw.length) return { parts: [], raw, pivot: [o.x, o.y, o.z] };
  const rot = [o.rx || 0, o.ry || 0, o.rz || 0];
  const rotated = raw.map(p => ({ ...p, solid: rot.some(Boolean) ? p.solid.rotate(rot) : p.solid }));
  const b = (rotated.length === 1 ? rotated[0].solid : Manifold.union(rotated.map(p => p.solid))).boundingBox();
  const t = [o.x - (b.min[0] + b.max[0]) / 2, o.y - (b.min[1] + b.max[1]) / 2, o.z - b.min[2]];
  return { parts: rotated.map(p => ({ ...p, solid: p.solid.translate(t), id: o.id })), raw, pivot: t };
}

/** Compatibilidad: un único sólido con todo el objeto. */
export async function objectSolid(o, ctx) {
  const { Manifold } = wasm();
  const { parts } = await objectParts(o, ctx);
  return parts.length === 1 ? parts[0].solid : Manifold.union(parts.map(p => p.solid));
}

/** Caja que ocupa un conjunto de piezas. */
export function partsBox(parts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const b = p.solid.boundingBox();
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
  }
  return { min, max, size: max.map((v, i) => v - min[i]), center: max.map((v, i) => (v + min[i]) / 2) };
}

/**
 * Resultado del diseño: une por color y resta los huecos sueltos.
 * @param partsById Map id → parts (de objectParts)
 */
export function sceneParts(objs, partsById) {
  const entries = [], holes = [];
  for (const o of objs) {
    if (o.hidden) continue;
    for (const p of partsById.get(o.id) || []) (p.hole ? holes : entries).push(p);
  }
  if (!entries.length) return [];
  return resolveColors(entries, holes.map(p => p.solid)).map((p, i) => ({ name: `Color ${i + 1}`, color: p.color, solid: p.solid }));
}

// ---------------- Agrupar / desagrupar ----------------

/** Agrupa objetos (ya posicionados en el mundo). Devuelve el grupo nuevo. */
export async function groupObjects(objs, ctx, index = 0) {
  const solidsOnly = objs.filter(o => !o.hole);
  const g = {
    id: newId(), type: 'group', name: `Grupo ${index + 1}`,
    x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, rx: 0, ry: 0, rz: 0,
    color: (solidsOnly[0] || objs[0]).color, hole: objs.every(o => o.hole), hidden: false, locked: false,
    mirror: [false, false, false], multicolor: new Set(solidsOnly.map(o => o.color)).size > 1,
    children: objs.map(o => cloneObj(o)),
  };
  // El tamaño del grupo es el de su resultado (los huecos no cuentan)
  const local = await groupLocal(g, ctx);
  const box = local.box || partsBox((await Promise.all(objs.map(o => objectParts(o, ctx)))).flatMap(r => r.parts));
  Object.assign(g, { x: box.center[0], y: box.center[1], z: box.min[2], w: box.size[0], d: box.size[1], h: box.size[2] });
  return g;
}

/** Desagrupa: devuelve los hijos en coordenadas del mundo. */
export async function ungroupObject(g, ctx) {
  const { parts } = await objectParts(g, ctx);
  const rotated = g.rx || g.ry || g.rz || (g.mirror || []).some(Boolean);
  const local = await groupLocal(g, ctx);
  if (!rotated && local.box) {
    const lb = local.box, wb = partsBox(parts);
    const scale = [g.w / (lb.size[0] || 1), g.d / (lb.size[1] || 1), g.h / (lb.size[2] || 1)];
    const uniform = scale.every(v => Math.abs(v - 1) < 1e-6);
    return g.children.map(ch => {
      const c = cloneObj(ch);
      c.x = wb.center[0] + (ch.x - lb.center[0]) * scale[0];
      c.y = wb.center[1] + (ch.y - lb.center[1]) * scale[1];
      c.z = wb.min[2] + (ch.z - lb.min[2]) * scale[2];
      if (!uniform) { c.w *= scale[0]; c.d *= scale[1]; c.h *= scale[2]; }
      return c;
    });
  }
  // Con rotación o espejo: cada pieza pasa a ser una malla fija en su lugar
  return parts.map((p, i) => {
    const b = p.solid.boundingBox();
    return {
      ...makeObject('stl', i, { color: p.color, hole: p.hole }),
      name: `${g.name} · pieza ${i + 1}`, mesh: solidToMeshData(p.solid),
      x: (b.min[0] + b.max[0]) / 2, y: (b.min[1] + b.max[1]) / 2, z: b.min[2],
      w: b.max[0] - b.min[0], d: b.max[1] - b.min[1], h: b.max[2] - b.min[2],
    };
  });
}

// ---------------- Mallas (STL, generadores) ----------------

/** Lee un STL (binario o texto) y devuelve vértices únicos + triángulos. */
export function parseSTLMesh(buffer) {
  const dv = new DataView(buffer);
  let tri = null;
  if (buffer.byteLength >= 84) {
    const n = dv.getUint32(80, true);
    if (84 + n * 50 === buffer.byteLength) {
      tri = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) for (let j = 0; j < 9; j++) tri[i * 9 + j] = dv.getFloat32(84 + i * 50 + 12 + j * 4, true);
    }
  }
  if (!tri) {
    const text = new TextDecoder().decode(buffer);
    const vals = [];
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let m;
    while ((m = re.exec(text))) vals.push(+m[1], +m[2], +m[3]);
    tri = new Float32Array(vals);
  }
  if (!tri.length) throw new Error('El STL no tiene triángulos');
  const map = new Map(), verts = [], tris = new Uint32Array(tri.length / 3);
  for (let i = 0; i < tri.length; i += 3) {
    const key = `${Math.round(tri[i] * 1e4)},${Math.round(tri[i + 1] * 1e4)},${Math.round(tri[i + 2] * 1e4)}`;
    let idx = map.get(key);
    if (idx === undefined) { idx = verts.length / 3; map.set(key, idx); verts.push(tri[i], tri[i + 1], tri[i + 2]); }
    tris[i / 3] = idx;
  }
  return { verts: Array.from(verts), tris: Array.from(tris) };
}

/** Malla liviana (para guardar) a partir de un sólido de manifold. */
export function solidToMeshData(solid) {
  const m = solid.getMesh();
  const n = m.numProp, verts = new Array((m.vertProperties.length / n) * 3);
  for (let i = 0, j = 0; i < m.vertProperties.length; i += n, j += 3) {
    verts[j] = +m.vertProperties[i].toFixed(4); verts[j + 1] = +m.vertProperties[i + 1].toFixed(4); verts[j + 2] = +m.vertProperties[i + 2].toFixed(4);
  }
  return { verts, tris: Array.from(m.triVerts) };
}

const meshCache = new WeakMap();
export function meshToManifold(mesh) {
  const { Manifold, Mesh } = wasm();
  const cached = meshCache.get(mesh);
  if (cached) return cached;
  const m = new Mesh({ numProp: 3, vertProperties: new Float32Array(mesh.verts), triVerts: new Uint32Array(mesh.tris) });
  m.merge();
  const solid = new Manifold(m);
  if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('El STL no es un sólido cerrado; repáralo en el laminador y volvé a importarlo');
  meshCache.set(mesh, solid);
  return solid;
}
