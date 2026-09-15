/**
 * Traduce la validez geométrica del plan a una presentación segura para UI.
 * No depende del DOM: devuelve únicamente datos serializables.
 */

export function getGeometryFabricationVisualStatus(plan = {}) {
  const validity = plan?.fabricationValidity ?? plan?.geometryFabricationValidity ?? {};
  const status = validity.status ?? 'unknown';
  const blockedPieceIds = Array.isArray(validity.blockedPieceIds)
    ? validity.blockedPieceIds.map(String)
    : [];

  if (status === 'stale') {
    return {
      status: 'stale',
      label: 'PLAN DESACTUALIZADO',
      message: 'La geometría de una o más piezas cambió. Volvé a planificar antes de fabricar.',
      blockedPieceIds,
      blocked: true
    };
  }

  if (status === 'unknown') {
    return {
      status: 'unknown',
      label: 'VALIDACIÓN PENDIENTE',
      message: 'No se pudo verificar el origen geométrico. La fabricación queda bloqueada hasta validar.',
      blockedPieceIds,
      blocked: true
    };
  }

  return {
    status: 'valid',
    label: 'GEOMETRÍA VALIDADA',
    message: 'El origen geométrico coincide con el plan guardado.',
    blockedPieceIds,
    blocked: false
  };
}
