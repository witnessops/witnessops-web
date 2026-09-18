import test from 'node:test';
import assert from 'node:assert/strict';
import { freeWorkspaceCeiling } from './free-workspace';

test('free admission is opt-in and rejects ambiguous or unbounded configuration', () => {
  assert.equal(freeWorkspaceCeiling({}), null);
  for (const value of ['2', '3', '20']) assert.equal(freeWorkspaceCeiling({ WITNESSOPS_FREE_WORKSPACE_LIMIT: value }), Number(value));
  for (const value of ['0', '1', '21', '-1', '2.5', '02', '2 ', 'true']) assert.throws(() => freeWorkspaceCeiling({ WITNESSOPS_FREE_WORKSPACE_LIMIT: value }));
});
