/**
 * Limpieza de memoria de WebAssembly.
 * Cada operación de manifold crea objetos que JavaScript no libera solo.
 * Registramos todo lo que se crea y, antes de cada nueva generación,
 * borramos lo que ya no se muestra.
 */
const live = new Set();

const MANIFOLD_STATIC = ['cube', 'cylinder', 'sphere', 'tetrahedron', 'extrude', 'revolve', 'compose', 'union', 'difference', 'intersection', 'levelSet', 'smooth', 'ofMesh', 'hull'];
const MANIFOLD_METHODS = ['add', 'subtract', 'intersect', 'decompose', 'warp', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'refine', 'refineToLength', 'setProperties', 'simplify', 'asOriginal', 'trimByPlane', 'split', 'splitByPlane', 'slice', 'project', 'hull', 'calculateNormals', 'smoothOut'];
const CS_STATIC = ['square', 'circle', 'union', 'difference', 'intersection', 'compose', 'ofPolygons', 'hull'];
const CS_METHODS = ['add', 'subtract', 'intersect', 'rectClip', 'decompose', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'simplify', 'offset', 'hull', 'extrude', 'revolve'];

const remember = r => {
  if (Array.isArray(r)) r.forEach(x => x && x.delete && live.add(x));
  else if (r && typeof r.delete === 'function') live.add(r);
  return r;
};

function wrap(target, names) {
  for (const n of names) {
    const fn = target[n];
    if (typeof fn !== 'function' || fn.__g3d) continue;
    const wrapped = function (...args) { return remember(fn.apply(this, args)); };
    wrapped.__g3d = true;
    target[n] = wrapped;
  }
}

export function enableGC(w) {
  wrap(w.Manifold, MANIFOLD_STATIC);
  wrap(w.Manifold.prototype, MANIFOLD_METHODS);
  wrap(w.CrossSection, CS_STATIC);
  wrap(w.CrossSection.prototype, CS_METHODS);
}

/** Registra un objeto creado con `new` (los constructores no se pueden interceptar). */
export const track = remember;

/** Borra todo lo creado salvo los objetos indicados. */
export function collect(keep = []) {
  const k = new Set(keep);
  for (const o of live) {
    if (k.has(o)) continue;
    try { o.delete(); } catch { /* ya borrado */ }
    live.delete(o);
  }
}
