/**
 * Evaluación segura de validez de fabricación según la versión geométrica.
 * No modifica geometría ni depende de Three.js o del DOM.
 */

function validityFromVersion(status) {
  if (status === 'current') return 'valid';
  if (status === 'changed') return 'stale';
  return 'unknown';
}

export function evaluateGeometryFabricationPiece(piece = {}) {
  const fabricationValidity = validityFromVersion(piece.geometryVersionStatus);

  return {
    ...piece,
    fabricationValidity,
    fabricationBlocked: piece.status === 'placed' && fabricationValidity !== 'valid'
  };
}

export function evaluateGeometryFabricationPlan(state = {}) {
  const pieces = Array.isArray(state.pieces)
    ? state.pieces.map(evaluateGeometryFabricationPiece)
    : [];

  const blocked = pieces.filter(piece => piece.fabricationBlocked);
  const stale = blocked.filter(piece => piece.fabricationValidity === 'stale');
  const unknown = blocked.filter(piece => piece.fabricationValidity === 'unknown');
  const status = stale.length > 0 ? 'stale' : unknown.length > 0 ? 'unknown' : 'valid';

  return {
    ...state,
    pieces,
    placed: pieces.filter(piece => piece.status === 'placed'),
    rejected: pieces.filter(piece => piece.status === 'rejected'),
    fabricationValidity: {
      status,
      ready: status === 'valid',
      blockedPieceIds: blocked.map(piece => piece.id),
      stalePieceIds: stale.map(piece => piece.id),
      unknownPieceIds: unknown.map(piece => piece.id)
    }
  };
}
