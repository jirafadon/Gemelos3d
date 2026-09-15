import { recoverGeometryFabricationState, findGeometryOrigin } from './geometry-fabrication-recovery.js';

const project = {
  fabrication: {
    pieces: [
      { id: 'pieza-1', name: 'Pieza 1', status: 'placed' },
      { id: 'pieza-2', name: 'Pieza 2', status: 'rejected', reason: 'no-fit' }
    ],
    beds: [{ index: 0, items: ['pieza-1'] }],
    selectedPiece: null,
    selectedBed: 0,
    geometryProvenance: {
      'pieza-1': {
        geometryId: 'geom-1',
        geometryName: 'Motor',
        geometrySource: 'imported-model',
        geometryType: 'piece',
        profileSchemaVersion: 1,
        geometryVersion: {
          schemaVersion: 1,
          signature: 'geom-1|imported-model|piece|10|20|30',
          geometryId: 'geom-1',
          dimensions: { width: 10, height: 20, depth: 30 }
        }
      }
    }
  }
};

test('marks recovered geometry as current when profile matches', () => {
  const state = recoverGeometryFabricationState(project, [{
    id: 'geom-1', source: 'imported-model', type: 'piece',
    dimensions: { width: 10, height: 20, depth: 30 }
  }]);
  expect(state.pieces[0].geometryVersionStatus).toBe('current');
});

test('marks recovered geometry as changed when dimensions differ', () => {
  const state = recoverGeometryFabricationState(project, [{
    id: 'geom-1', source: 'imported-model', type: 'piece',
    dimensions: { width: 11, height: 20, depth: 30 }
  }]);
  expect(state.pieces[0].geometryVersionStatus).toBe('changed');
});

test('recovers provenance attached to placed and rejected pieces', () => {
  const state = recoverGeometryFabricationState(project);
  expect(state.pieces[0].geometryProvenance.geometryId).toBe('geom-1');
  expect(state.pieces[1].geometryProvenance).toBeNull();
  expect(state.placed).toHaveLength(1);
  expect(state.rejected).toHaveLength(1);
});

test('finds a geometry origin by fabrication piece id', () => {
  expect(findGeometryOrigin(project, 'pieza-1').geometryName).toBe('Motor');
  expect(findGeometryOrigin(project, 'missing')).toBeNull();
});
