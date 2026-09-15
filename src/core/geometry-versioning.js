/**
 * Huella geométrica determinista y ligera para detectar cambios de origen.
 * No usa objetos Three.js ni serializa geometría completa.
 */

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dimensions(profile = {}) {
  const d = profile.dimensions ?? {};
  return {
    width: number(d.width),
    height: number(d.height),
    depth: number(d.depth)
  };
}

export function createGeometryVersion(profile = {}) {
  const d = dimensions(profile);
  const signature = [
    String(profile.id ?? ''),
    String(profile.source ?? ''),
    String(profile.type ?? ''),
    d.width,
    d.height,
    d.depth
  ].join('|');

  return {
    schemaVersion: 1,
    signature,
    geometryId: String(profile.id ?? ''),
    dimensions: d
  };
}

export function geometryVersionMatches(profile = {}, version = {}) {
  return Boolean(version?.signature) && createGeometryVersion(profile).signature === version.signature;
}

export function compareGeometryVersion(profile = {}, version = {}) {
  if (!version?.signature) return 'unknown';
  return geometryVersionMatches(profile, version) ? 'current' : 'changed';
}
