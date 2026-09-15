/**
 * Adaptador entre fichas geométricas y piezas fabricables.
 * Conserva la información 3D sin acoplar el planificador a Three.js.
 */

function normalizeText(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function geometryProfileToFabricationPiece(profile = {}, options = {}) {
  const id = normalizeText(profile.id, options.idFallback ?? 'piece');
  const name = normalizeText(profile.name, id);
  const dimensions = profile.dimensions ?? {};

  return {
    id,
    name,
    width: normalizeNumber(dimensions.width),
    depth: normalizeNumber(dimensions.depth),
    height: normalizeNumber(dimensions.height),
    source: normalizeText(profile.source, 'geometry'),
    geometryType: profile.type ?? 'piece',
    geometryProfile: {
      ...profile,
      dimensions: { ...dimensions }
    },
    metadata: { ...(profile.metadata ?? {}) }
  };
}

export function geometryProfilesToFabricationPieces(profiles = [], options = {}) {
  const list = Array.isArray(profiles) ? profiles : [];
  return list.map((profile, index) => geometryProfileToFabricationPiece(profile, {
    ...options,
    idFallback: options.idFallback ?? `piece-${index + 1}`
  }));
}
