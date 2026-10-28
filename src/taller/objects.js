/**
 * Objetos del Taller 3D (estilo Tinkercad) y cómo se convierten en sólidos.
 * Posición: X/Y = centro del objeto, Z = altura de su base.
 * Este módulo no depende del navegador: se prueba en Node.
 */
import { wasm, textShape, slab, part } from '../engine/geom.js';
import { track } from '../engine/gc.js';
import { fitInto } from '../engine/shapes.js';
import { maskToShape, sampleMask } from '../engine/trace.js';

export const TYPES = {
  box: { label: 'Caja', size: [20, 20, 20] },
  cylinder: { label: 'Cilindro', size: [20, 20, 20] },
  sphere: { label: 'Esfera', size: [20, 20, 20] },
  cone: { label: 'Cono', size: [20, 20, 20] },
  tube: { label: 'Tubo', size: [20, 20, 20] },
  wedge: { label: 'Cuña', size: [20, 20, 20] },
  text: { label: 'Texto', size: [40, 12, 4] },
  image: { label: 'Imagen', size: [40, 40, 3] },
  stl: { label: 'STL', size: [20, 20, 20] },
};

const PALETTE = ['#1D4ED8', '#D62828', '#2A9D8F', '#F77F00', '#7B2CBF', '#FCBF49', '#F72585', '#8AC926'];
let seq = 0;
export const newId = () => `o${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeObject(type, index = 0, extra = {}) {
  const [w, d, h] = TYPES[type].size;
  const o = {
    id: newId(), type, name: `${TYPES[type].label} ${index + 1}`,
    x: 0, y: 0, z: 0, w, d, h, rx: 0, ry: 0, rz: 0,
    color: PALETTE[index % PALETTE.length], hole: false,
  };
  if (type === 'tube') o.wall = 2;
  if (type === 'text') Object.assign(o, { text: 'Hola', font: 'baloo' });
  if (type === 'image') Object.assign(o, { image: '', threshold: 128, invert: false });
  return Object.assign(o, extra);
}

/** Forma "cruda" del objeto, centrada en X/Y/Z, con su tamaño ya aplicado. */
async function rawSolid(o, ctx) {
  const { Manifold, CrossSection } = wasm();
  const w = Math.max(0.1, o.w), d = Math.max(0.1, o.d), h = Math.max(0.1, o.h);
  switch (o.type) {
    case 'box': return Manifold.cube([w, d, h], true);
    case 'cylinder': return Manifold.cylinder(h, 0.5, 0.5, 96, true).scale([w, d, 1]);
    case 'sphere': return Manifold.sphere(0.5, 72).scale([w, d, h]);
    case 'cone': return Manifold.cylinder(h, 0.5, 0, 96, true).scale([w, d, 1]);
    case 'tube': {
      const t = Math.min(o.wall || 2, w / 2 - 0.2, d / 2 - 0.2);
      const outer = Manifold.cylinder(h, 0.5, 0.5, 96, true).scale([w, d, 1]);
      const inner = Manifold.cylinder(h + 2, 0.5, 0.5, 96, true).scale([Math.max(0.1, w - 2 * t), Math.max(0.1, d - 2 * t), 1]);
      return outer.subtract(inner);
    }
    case 'wedge': {
      const tri = track(new CrossSection([[[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2]]], 'NonZero'));
      return tri.extrude(d).translate([0, 0, -d / 2]).rotate([90, 0, 0]);
    }
    case 'text': {
      const font = await ctx.font(o.font || 'baloo');
      const cs = textShape(font, o.text || ' ', { height: d });
      return slab(fitInto(cs, w, d), h).translate([0, 0, -h / 2]);
    }
    case 'image': {
      const mask = o.image && ctx.image ? await ctx.image(o.image, { threshold: o.threshold ?? 128, invert: !!o.invert, maxPx: 320 }) : sampleMask();
      const cs = maskToShape(mask, { width: 100, smooth: 0.4 });
      return slab(fitInto(cs, w, d), h).translate([0, 0, -h / 2]);
    }
    case 'stl': {
      if (!o.mesh) return Manifold.cube([w, d, h], true);
      const m = meshToManifold(o.mesh);
      const b = m.boundingBox();
      const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
      return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -(b.min[2] + b.max[2]) / 2]).scale([w / sx, d / sy, h / sz]);
    }
    default: throw new Error(`Tipo desconocido: ${o.type}`);
  }
}

/** Sólido final del objeto: tamaño, rotación y posición (Z = base). */
export async function objectSolid(o, ctx) {
  let s = await rawSolid(o, ctx);
  if (o.rx || o.ry || o.rz) s = s.rotate([o.rx || 0, o.ry || 0, o.rz || 0]);
  const b = s.boundingBox();
  return s.translate([o.x - (b.min[0] + b.max[0]) / 2, o.y - (b.min[1] + b.max[1]) / 2, o.z - b.min[2]]);
}

/**
 * Resultado del diseño: une los sólidos por color y les resta todos los huecos.
 * @param solids Map id → Manifold (ya posicionado)
 */
export function sceneParts(objs, solids) {
  const { Manifold } = wasm();
  const holes = objs.filter(o => o.hole && solids.get(o.id)).map(o => solids.get(o.id));
  const holeAll = holes.length ? Manifold.union(holes) : null;
  const byColor = new Map();
  for (const o of objs) {
    if (o.hole || !solids.get(o.id)) continue;
    byColor.set(o.color, [...(byColor.get(o.color) || []), solids.get(o.id)]);
  }
  const parts = [];
  // Si dos colores se pisan, el que se agregó después gana ese volumen
  let claimed = null;
  const order = [...byColor.keys()].reverse();
  const result = new Map();
  for (const color of order) {
    let s = Manifold.union(byColor.get(color));
    if (holeAll) s = s.subtract(holeAll);
    if (claimed) s = s.subtract(claimed);
    claimed = claimed ? claimed.add(s) : s;
    result.set(color, s);
  }
  for (const color of byColor.keys()) {
    const s = result.get(color);
    if (s && !s.isEmpty()) parts.push(part(`Color ${parts.length + 1}`, color, s));
  }
  return parts;
}

// ---------- STL ----------

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
  // Une los vértices repetidos (el STL los guarda sueltos por triángulo)
  const map = new Map(), verts = [], tris = new Uint32Array(tri.length / 3);
  for (let i = 0; i < tri.length; i += 3) {
    const key = `${Math.round(tri[i] * 1e4)},${Math.round(tri[i + 1] * 1e4)},${Math.round(tri[i + 2] * 1e4)}`;
    let idx = map.get(key);
    if (idx === undefined) { idx = verts.length / 3; map.set(key, idx); verts.push(tri[i], tri[i + 1], tri[i + 2]); }
    tris[i / 3] = idx;
  }
  return { verts: Array.from(verts), tris: Array.from(tris) };
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
