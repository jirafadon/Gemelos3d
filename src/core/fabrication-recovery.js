import { hydrateProject } from '../project/project-state.js';

/**
 * Normaliza el estado persistido de fabricación para reconstruir la vista.
 * No depende de Three.js ni del DOM.
 */
export function recoverFabricationState(project) {
  const hydrated = hydrateProject(project);
  const fabrication = hydrated.fabrication ?? {};
  const pieces = Array.isArray(fabrication.pieces) ? fabrication.pieces : [];
  const beds = Array.isArray(fabrication.beds) ? fabrication.beds : [];

  const placed = pieces.filter(piece => piece.status === 'placed');
  const rejected = pieces.filter(piece => piece.status === 'rejected');

  return {
    beds: beds.map((bed, index) => ({
      index: Number.isInteger(bed.index) ? bed.index : index,
      items: Array.isArray(bed.items) ? [...bed.items] : []
    })),
    pieces: pieces.map(piece => ({ ...piece })),
    placed,
    rejected,
    selectedPiece: fabrication.selectedPiece ?? null,
    selectedBed: Number.isInteger(fabrication.selectedBed) ? fabrication.selectedBed : 0,
    complete: pieces.length === placed.length + rejected.length
  };
}
