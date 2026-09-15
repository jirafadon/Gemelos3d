/**
 * Clasificación geométrica independiente de Three.js.
 * Permite distinguir una pieza individual de un conjunto compuesto.
 */

const TYPES = new Set(['piece', 'assembly', 'model']);

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

export function classifyGeometry({ childCount = 0, meshCount = 0, explicitType = null } = {}) {
  if (TYPES.has(explicitType)) return explicitType;

  const children = normalizeCount(childCount);
  const meshes = normalizeCount(meshCount);

  if (meshes > 1 || children > 1) return 'assembly';
  if (meshes === 1 || children === 1) return 'piece';
  return 'model';
}

export function classifyHierarchy(nodes = [], explicitType = null) {
  const list = Array.isArray(nodes) ? nodes : [];
  const meshCount = list.filter(node => node?.isMesh === true || node?.type === 'Mesh').length;

  return classifyGeometry({
    childCount: list.length,
    meshCount,
    explicitType
  });
}

export function isCompositeGeometry(type) {
  return type === 'assembly';
}
