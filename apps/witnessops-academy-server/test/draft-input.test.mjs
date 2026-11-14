import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  MAX_BODY_BYTES,
  MAX_CONTENT_BYTES,
  PG_INT_MAX,
  publicErrorCode,
  validateDraft,
  worstCaseDraftJsonBytes,
} from '../src/draft-input.mjs';
import { discardAfterResponse, readBody } from '../src/read-body.mjs';

const validId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function draft(overrides = {}) {
  return {
    content: 'synthetic',
    expected_version: 1,
    save_request_id: validId,
    ...overrides,
  };
}

test('a malformed id, a version of 2^31 or more, and NUL content are 400', () => {
  assert.equal(validateDraft(draft({ save_request_id: 'not-a-uuid' })).status, 400);
  assert.equal(validateDraft(draft({ save_request_id: 'a'.repeat(36) })).status, 400);
  assert.equal(validateDraft(draft({ expected_version: 2 ** 31 })).status, 400);
  assert.equal(validateDraft(draft({ expected_version: PG_INT_MAX + 1 })).status, 400);
  assert.equal(validateDraft(draft({ content: 'a\0b' })).status, 400);
  assert.equal(validateDraft(draft({ content: '' })).status, 400);
  assert.equal(validateDraft(draft({ content: '\uD800' })).status, 400);
  assert.equal(validateDraft(draft({ content: 'ok\uD83D\uDCD8' })).ok, true);
  const accepted = validateDraft(draft({ save_request_id: validId.toUpperCase() }));
  assert.equal(accepted.ok, true);
  assert.equal(accepted.saveRequestId, validId);
  assert.equal(validateDraft(draft({ expected_version: PG_INT_MAX })).ok, true);
});

test('the body limit holds the worst-case JSON encoding of a 32 KiB draft', () => {
  const worst = worstCaseDraftJsonBytes(MAX_CONTENT_BYTES);
  assert.ok(worst <= MAX_BODY_BYTES);
  assert.ok(worst > 64 * 1024);
  assert.equal(validateDraft(draft({ content: 'a'.repeat(MAX_CONTENT_BYTES + 1) })).status, 413);
});

test('an oversized body stops reading and is destroyed only after the 413 is sent', async () => {
  const req = new EventEmitter();
  let resumed = false;
  let destroyed = false;
  req.pause = () => {};
  req.resume = () => { resumed = true; };
  req.destroy = () => { destroyed = true; };
  const pending = readBody(req, 8);
  req.emit('data', Buffer.alloc(6, 1));
  req.emit('data', Buffer.alloc(6, 2));
  await assert.rejects(pending, (error) => error.status === 413);
  assert.equal(resumed, false);
  assert.equal(destroyed, false);
  const res = new EventEmitter();
  discardAfterResponse(res, req);
  res.emit('finish');
  assert.equal(destroyed, true);
});

test('database failures are logged by code, not by the raw error text', () => {
  const error = Object.assign(new Error('invalid input syntax for type uuid: "not-a-uuid"'), { code: '22P02' });
  const logged = publicErrorCode(error);
  assert.equal(logged, '22P02');
  assert.equal(logged.includes('not-a-uuid'), false);
  assert.equal(publicErrorCode(new Error('secret detail')), 'internal');
});
