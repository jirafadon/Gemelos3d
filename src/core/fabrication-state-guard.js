/**
 * Construye una guardia de fabricación desde el estado persistido.
 * No depende del DOM ni de Three.js.
 */

function placedPieces(state = {}) {
  return Array.isArray(state?.pieces)
    ? state.pieces.filter(piece => piece?.status === 'placed')
    : [];
}

export function evaluatePersistedFabricationState(state = {}) {
  const pieces = placedPieces(state);
  const blockedPieces = pieces.filter(piece => piece.fabricationBlocked === true);

  return {
    allowed: blockedPieces.length === 0,
    blockedPieceIds: blockedPieces.map(piece => piece.id),
    reason: blockedPieces.length ? 'geometry-outdated-or-unverified' : null,
    source: 'persisted-project'
  };
}

export function assertPersistedFabricationAllowed(state = {}) {
  const result = evaluatePersistedFabricationState(state);
  if (!result.allowed) {
    const error = new Error('La operación está bloqueada: el proyecto contiene piezas desactualizadas o sin verificar.');
    error.code = result.reason;
    error.blockedPieceIds = result.blockedPieceIds;
    throw error;
  }
  return result;
}
