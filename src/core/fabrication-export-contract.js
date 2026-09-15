/**
 * Contrato único para validar una exportación de fabricación.
 * Mantiene la decisión fuera del DOM y permite probar el flujo completo.
 */

import { evaluateFabricationExportGuard } from './fabrication-export-guard.js';
import { evaluatePersistedFabricationState } from './fabrication-state-guard.js';

export function evaluateFabricationExportContract({ live = null, persisted = null } = {}) {
  const liveResult = evaluateFabricationExportGuard(live ?? {});
  const persistedResult = evaluatePersistedFabricationState(persisted ?? {});
  const blockedPieceIds = [...new Set([
    ...liveResult.blockedPieceIds,
    ...persistedResult.blockedPieceIds
  ])];

  return {
    allowed: blockedPieceIds.length === 0,
    blockedPieceIds,
    reason: blockedPieceIds.length ? 'geometry-outdated-or-unverified' : null,
    sources: {
      live: liveResult,
      persisted: persistedResult
    }
  };
}

export function assertFabricationExportContract(state = {}) {
  const result = evaluateFabricationExportContract(state);
  if (!result.allowed) {
    const error = new Error('La exportación está bloqueada: hay piezas desactualizadas o sin verificar.');
    error.code = result.reason;
    error.blockedPieceIds = result.blockedPieceIds;
    throw error;
  }
  return result;
}
