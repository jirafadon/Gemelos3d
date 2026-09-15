import {
  geometryProfileToFabricationPiece,
  geometryProfilesToFabricationPieces
} from './geometry-fabrication-adapter.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runGeometryFabricationAdapterTests() {
  const piece = geometryProfileToFabricationPiece({
    id: 'pieza-1', name: 'Soporte', source: 'import', type: 'piece',
    dimensions: { width: 40, height: 12, depth: 30 }, metadata: { material: 'PLA' }
  });

  assert(piece.id === 'pieza-1', 'preserves id');
  assert(piece.name === 'Soporte', 'preserves name');
  assert(piece.width === 40 && piece.depth === 30, 'maps fabrication plane dimensions');
  assert(piece.height === 12, 'preserves height');
  assert(piece.source === 'import', 'preserves source');
  assert(piece.geometryProfile.dimensions.width === 40, 'preserves geometry profile');
  assert(piece.metadata.material === 'PLA', 'preserves metadata');

  const pieces = geometryProfilesToFabricationPieces([
    { dimensions: { width: 10, depth: 20, height: 5 } },
    { id: 'p2', dimensions: { width: 30, depth: 40, height: 8 } }
  ]);

  assert(pieces.length === 2, 'maps complete collection');
  assert(pieces[0].id === 'piece-1', 'creates deterministic fallback id');
  assert(pieces[1].id === 'p2', 'keeps explicit id');

  const invalid = geometryProfileToFabricationPiece({
    id: 'bad', dimensions: { width: 0, depth: -2, height: 4 }
  });
  assert(invalid.width === 0 && invalid.depth === -2, 'keeps invalid dimensions for fabrication validation');

  return true;
}
