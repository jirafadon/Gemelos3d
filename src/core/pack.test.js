import test from 'node:test';
import assert from 'node:assert/strict';
import { packPieces } from './pack.js';

test('empaqueta una pieza que entra en la cama', () => {
  const result = packPieces([{ id: 'A', width: 250, depth: 100 }], {
    width: 270, depth: 270, height: 250, margin: 5,
    purge: { mode: 'none' }
  });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.beds.length, 1);
  assert.equal(result.beds[0].items[0].rotation, 0);
});

test('una pieza que no entra ni siquiera rotada queda rechazada', () => {
  const result = packPieces([{ id: 'A', width: 280, depth: 100 }], {
    width: 270, depth: 270, height: 250, margin: 5,
    purge: { mode: 'none' }
  });
  assert.equal(result.beds.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].reason, 'no-fit');
});

test('usa rotación 90 cuando es la única orientación posible', () => {
  const result = packPieces([{ id: 'A', width: 90, depth: 250 }], {
    width: 270, depth: 270, height: 250, margin: 5,
    purge: { mode: 'none' }
  });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.beds[0].items[0].rotation, 90);
  assert.equal(result.beds[0].items[0].width, 250);
  assert.equal(result.beds[0].items[0].depth, 90);
});

test('no coloca una pieza dentro de la reserva de purga', () => {
  const result = packPieces([{ id: 'A', width: 35, depth: 35 }], {
    width: 100, depth: 100, height: 250, margin: 5,
    purge: { width: 40, depth: 40, corner: 'tr' }
  });
  assert.equal(result.rejected.length, 0);
  const placed = result.beds[0].items[0];
  assert.ok(placed.x < 10 || placed.y < 10);
});

test('crea varias camas cuando las piezas no comparten fila', () => {
  const result = packPieces([
    { id: 'A', width: 200, depth: 100 },
    { id: 'B', width: 200, depth: 100 }
  ], {
    width: 220, depth: 220, height: 250, margin: 5,
    purge: { mode: 'none' }
  }, { gap: 10 });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.beds.length, 2);
  assert.deepEqual(result.beds.map(b => b.items[0].id), ['A', 'B']);
});

test('no pierde silenciosamente una pieza imposible', () => {
  const result = packPieces([
    { id: 'ok', width: 100, depth: 100 },
    { id: 'bad', width: 500, depth: 500 }
  ], {
    width: 220, depth: 220, height: 250, margin: 5,
    purge: { mode: 'none' }
  });
  assert.equal(result.beds.flatMap(b => b.items).length, 1);
  assert.equal(result.rejected[0].item.id, 'bad');
});
