/**
 * Trazabilidad serializable entre una pieza fabricable y su origen geométrico.
 * No conserva objetos Three.js ni referencias del DOM.
 */

import { createGeometryVersion } from './geometry-versioning.js';

function text(value, fallback = null) {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

export function createGeometryProvenance(profile = {}, piece = {}) {
  const version = createGeometryVersion(profile);

  return {
    geometryId: text(profile.id, text(piece.id, null)),
    geometryName: text(profile.name, text(piece.name, null)),
    geometrySource: text(profile.source, text(piece.source, 'geometry')),
    geometryType: text(profile.type, text(piece.geometryType, 'piece')),
    profileSchemaVersion: Number.isFinite(Number(profile.schemaVersion))
      ? Number(profile.schemaVersion)
      : 1,
    geometryVersion: version
  };
}

export function buildGeometryProvenanceMap(plan = {}) {
  const profiles = Array.isArray(plan?.geometry?.profiles) ? plan.geometry.profiles : [];
  const pieces = Array.isArray(plan?.geometry?.pieces) ? plan.geometry.pieces : [];
  const byId = new Map(profiles.map(profile => [profile.id, profile]));

  return pieces.reduce((map, piece) => {
    const profile = byId.get(piece.id) ?? {};
    map[piece.id] = createGeometryProvenance(profile, piece);
    return map;
  }, {});
}

export function attachGeometryProvenance(project, plan) {
  if (!project || !plan) return project;

  return {
    ...project,
    fabrication: {
      ...(project.fabrication ?? {}),
      geometryProvenance: buildGeometryProvenanceMap(plan)
    }
  };
}

export function recoverGeometryProvenance(project) {
  const provenance = project?.fabrication?.geometryProvenance;
  return provenance && typeof provenance === 'object' ? { ...provenance } : {};
}
