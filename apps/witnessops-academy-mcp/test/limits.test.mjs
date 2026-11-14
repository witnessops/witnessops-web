import assert from 'node:assert/strict';
import test from 'node:test';
import { answerTextError, MAX_TEXT_BYTES } from '../src/limits.mjs';

test('NUL in an answer is rejected before it can reach PostgreSQL', () => {
  assert.deepEqual(answerTextError('keep\0this'), { error: 'invalid_text', status: 400 });
  assert.equal(answerTextError('plain text'), null);
  assert.equal(answerTextError('ą'.repeat(MAX_TEXT_BYTES / 2)), null);
});
