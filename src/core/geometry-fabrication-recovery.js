/**
 * Recuperación de relaciones entre piezas fabricables y su origen geométrico.
 * Opera únicamente sobre estado serializable persistido.
 */

import { recoverFabricationState } from './fabrication-recovery.js';
import { recoverGeometryProvenance } from './geometry-fabrication-provenance.js';
import { compareGeometryVersion } from './geometry-versioning.js';

export function recoverGeometryFabricationState(project, currentProfiles = []) {
  const fabrication = recoverFabricationState(project);
  const provenance = recoverGeometryProvenance(project);
  const profiles = Array.isArray(currentProfiles) ? currentProfiles : [];
  const currentById = new Map(profiles.map(profile => [String(profile.id), profile]));

  const pieces = fabrication.pieces.map(piece => {
    const origin = provenance[piece.id] ?? null;
    const currentProfile = origin ? currentById.get(origin.geometryId) : null;
    const versionStatus = currentProfile
      ? compareGeometryVersion(currentProfile, origin.geometryVersion)
      : (origin ? 'stored' : 'unknown');

    return {
      ...piece,
      geometryProvenance: origin,
      geometryVersionStatus: versionStatus
    };
  });

  return {
    ...fabrication,
    pieces,
    placed: pieces.filter(piece => piece.status === 'placed'),
    rejected: pieces.filter(piece => piece.status === 'rejected'),
    provenance
  };
}

export function findGeometryOrigin(project, pieceId) {
  const provenance = recoverGeometryProvenance(project);
  return provenance[String(pieceId)] ?? null;
}
