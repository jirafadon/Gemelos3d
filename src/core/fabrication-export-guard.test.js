import { evaluateFabricationExportGuard } from './fabrication-export-guard.js';
import { evaluatePersistedFabricationState } from './fabrication-state-guard.js';

const healthy = { pieces: [{ id: 1, status: 'placed', fabricationBlocked: false }] };
const blocked = { pieces: [{ id: 7, status: 'placed', fabricationBlocked: true }] };

export function runFabricationExportGuardChecks() {
  const checks = [
    ['live healthy state is allowed', evaluateFabricationExportGuard(healthy).allowed === true],
    ['live blocked state is rejected', evaluateFabricationExportGuard(blocked).allowed === false],
    ['persisted healthy state is allowed', evaluatePersistedFabricationState(healthy).allowed === true],
    ['persisted blocked state is rejected', evaluatePersistedFabricationState(blocked).allowed === false],
    ['blocked ids are preserved', evaluatePersistedFabricationState(blocked).blockedPieceIds.includes(7)]
  ];

  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length) {
    throw new Error(`Fabrication export guard checks failed: ${failed.join(', ')}`);
  }
  return { passed: checks.length, failed: 0 };
}
