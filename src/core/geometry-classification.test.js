import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyGeometry, classifyHierarchy, isCompositeGeometry } from './geometry-classification.js';

test('classifies a single mesh as a piece', () => {
  assert.equal(classifyGeometry({ meshCount: 1, childCount: 1 }), 'piece');
});

test('classifies multiple meshes as an assembly', () => {
  assert.equal(classifyGeometry({ meshCount: 3, childCount: 3 }), 'assembly');
});

test('classifies an empty hierarchy as a generic model', () => {
  assert.equal(classifyGeometry(), 'model');
});

test('explicit type wins when valid', () => {
  assert.equal(classifyGeometry({ meshCount: 4, explicitType: 'piece' }), 'piece');
});

test('classifies hierarchy nodes by mesh markers', () => {
  assert.equal(classifyHierarchy([
    { isMesh: true },
    { isMesh: true },
    { isObject3D: true }
  ]), 'assembly');
});

test('identifies composite geometry', () => {
  assert.equal(isCompositeGeometry('assembly'), true);
  assert.equal(isCompositeGeometry('piece'), false);
});
