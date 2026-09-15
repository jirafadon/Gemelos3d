import { evaluateGeometryFabricationPiece, evaluateGeometryFabricationPlan } from './geometry-fabrication-invalidation.js';

describe('geometry fabrication invalidation', () => {
  it('marks current placed pieces as valid and ready', () => {
    const result = evaluateGeometryFabricationPlan({
      pieces: [{ id: 'a', status: 'placed', geometryVersionStatus: 'current' }]
    });

    expect(result.pieces[0].fabricationValidity).toBe('valid');
    expect(result.pieces[0].fabricationBlocked).toBe(false);
    expect(result.fabricationValidity).toEqual({
      status: 'valid',
      ready: true,
      blockedPieceIds: [],
      stalePieceIds: [],
      unknownPieceIds: []
    });
  });

  it('blocks a placed piece when its geometry changed', () => {
    const result = evaluateGeometryFabricationPlan({
      pieces: [{ id: 'motor', status: 'placed', geometryVersionStatus: 'changed' }]
    });

    expect(result.fabricationValidity.status).toBe('stale');
    expect(result.fabricationValidity.ready).toBe(false);
    expect(result.fabricationValidity.stalePieceIds).toEqual(['motor']);
  });

  it('blocks unknown geometry versions conservatively', () => {
    const piece = evaluateGeometryFabricationPiece({
      id: 'unknown',
      status: 'placed',
      geometryVersionStatus: 'stored'
    });

    expect(piece.fabricationValidity).toBe('unknown');
    expect(piece.fabricationBlocked).toBe(true);
  });

  it('does not block already rejected pieces', () => {
    const result = evaluateGeometryFabricationPlan({
      pieces: [{ id: 'rejected', status: 'rejected', geometryVersionStatus: 'changed' }]
    });

    expect(result.fabricationValidity.ready).toBe(true);
    expect(result.pieces[0].fabricationBlocked).toBe(false);
  });
});
