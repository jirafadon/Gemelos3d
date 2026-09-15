/**
 * Guardia de seguridad para operaciones finales de fabricación/exportación.
 * No permite continuar si el plan contiene piezas colocadas con geometría
 * desactualizada o sin verificar.
 */

export function evaluateFabricationExportGuard(state = {}) {
  const pieces = Array.isArray(state.pieces) ? state.pieces : [];
  const blockedPieces = pieces.filter(piece => (
    piece.status === 'placed' && piece.fabricationBlocked === true
  ));

  return {
    allowed: blockedPieces.length === 0,
    blockedPieceIds: blockedPieces.map(piece => piece.id),
    reason: blockedPieces.length
      ? 'geometry-outdated-or-unverified'
      : null
  };
}

export function assertFabricationExportAllowed(state = {}) {
  const guard = evaluateFabricationExportGuard(state);
  if (!guard.allowed) {
    const error = new Error('La exportación está bloqueada: hay piezas con geometría desactualizada o sin verificar.');
    error.code = guard.reason;
    error.blockedPieceIds = guard.blockedPieceIds;
    throw error;
  }
  return guard;
}
