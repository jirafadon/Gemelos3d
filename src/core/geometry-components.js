/**
 * Extracción estructural de componentes de un modelo 3D.
 * No depende de Three.js: trabaja con nodos serializables y conserva el orden.
 */

function normalizeId(value, fallback) {
  const id = String(value ?? '').trim();
  return id || fallback;
}

function normalizeName(value, fallback) {
  const name = String(value ?? '').trim();
  return name || fallback;
}

function isGeometryNode(node) {
  return Boolean(node?.isMesh === true || node?.type === 'Mesh' || node?.geometry);
}

export function extractGeometryComponents(nodes = [], options = {}) {
  const list = Array.isArray(nodes) ? nodes : [];
  const prefix = normalizeId(options.idPrefix, 'component');
  const components = [];

  list.forEach((node, index) => {
    if (!isGeometryNode(node)) return;

    const id = normalizeId(node.id ?? node.uuid, `${prefix}-${components.length + 1}`);
    const name = normalizeName(node.name, id);

    components.push({
      id,
      name,
      index,
      geometry: node.geometry ?? null,
      source: node.source ?? options.source ?? 'unknown',
      metadata: { ...(node.metadata ?? {}) }
    });
  });

  return components;
}

export function extractComponentsFromHierarchy(root, options = {}) {
  const components = [];

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (isGeometryNode(node)) components.push(node);
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(visit);
  }

  visit(root);
  return extractGeometryComponents(components, options);
}
