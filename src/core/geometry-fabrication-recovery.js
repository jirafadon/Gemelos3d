/**
 * Recuperación de relaciones entre piezas fabricables y su origen geométrico.
 * Opera únicamente sobre estado serializable persistido.
 */

import { recoverFabricationState } from './fabrication-recovery.js';
import { recoverGeometryProvenance } from './geometry-fabrication-provenance.js';

export function recoverGeometryFabricationState(project) {
  const fabrication = recoverFabricationState(project);
  const provenance = recoverGeometryProvenance(project);

  const pieces = fabrication.pieces.map(piece => ({
    ...piece,
    geometryProvenance: provenance[piece.id] ?? null
  }));

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
