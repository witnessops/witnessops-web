import assert from 'node:assert/strict';
import test from 'node:test';
import { answerTextError, MAX_TEXT_BYTES } from '../src/limits.mjs';

test('NUL in an answer is rejected before it can reach PostgreSQL', () => {
  assert.deepEqual(answerTextError('keep\0this'), { error: 'invalid_text', status: 400 });
  assert.equal(answerTextError('plain text'), null);
  assert.equal(answerTextError('ą'.repeat(MAX_TEXT_BYTES / 2)), null);
});

test('a lone UTF-16 surrogate is rejected and a paired character is kept', () => {
  assert.deepEqual(answerTextError('\uD800'), { error: 'invalid_text', status: 400 });
  assert.deepEqual(answerTextError('tail\uDFFF'), { error: 'invalid_text', status: 400 });
  assert.equal(answerTextError('ok\uD83D\uDCD8'), null);
});

test('an empty answer is rejected so an unedited draft is not stored', () => {
  assert.deepEqual(answerTextError(''), { error: 'empty_text', status: 400 });
  assert.equal(answerTextError(' '), null);
});
