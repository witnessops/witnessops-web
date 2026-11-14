import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createSessionTokenCodec, assertTokenStorageReady } from '../src/session-tokens.mjs';
const key = () => crypto.randomBytes(32).toString('base64');
const ring = { active: 'current', keys: { current: key(), previous: key() } };
const context = { issuer: 'https://idp.example.invalid/realms/academy', clientId: 'academy-app' };
const row = { token_hash: 'a'.repeat(64), identity_id: 'synthetic-identity' };
const tokens = { id_token: 'synthetic-id', access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' };
const codec = (value = ring, settings = context) => createSessionTokenCodec(JSON.stringify(value), settings);
test('all three tokens round trip in a randomized authenticated envelope', () => {
  const c = codec(), a = c.seal(tokens, row), b = c.seal(tokens, row);
  assert.notEqual(a, b);
  assert.match(a, /^v1\.current\./);
  for (const value of Object.values(tokens)) assert.equal(a.includes(value), false);
  assert.deepEqual(c.open(a, row), { tokens, needsRewrap: false });
});
test('ciphertext, tag, version, key id and context cannot be substituted', () => {
  const c = codec(), sealed = c.seal(tokens, row);
  for (const index of [0, 1, 2, 3, 4]) {
    const parts = sealed.split('.');
    parts[index] = parts[index].startsWith('A') ? 'B' + parts[index].slice(1) : 'A' + parts[index].slice(1);
    assert.throws(() => c.open(parts.join('.'), row), { code: 'session_token_protection_failed' });
  }
  for (const other of [{ ...row, token_hash: 'b'.repeat(64) }, { ...row, identity_id: 'other' }]) assert.throws(() => c.open(sealed, other));
  for (const settings of [{ ...context, issuer: 'https://other.example.invalid' }, { ...context, clientId: 'other' }]) assert.throws(() => codec(ring, settings).open(sealed, row));
});
test('rotation reads a retained previous key and only writes the active key', () => {
  const previous = codec({ ...ring, active: 'previous' }).seal(tokens, row);
  const opened = codec().open(previous, row);
  assert.equal(opened.needsRewrap, true);
  assert.match(codec().seal(opened.tokens, row), /^v1\.current\./);
  assert.throws(() => codec({ active: 'current', keys: { current: ring.keys.current } }).open(previous, row));
});
test('missing/malformed keyrings, plaintext, oversized or malformed envelopes fail closed', () => {
  for (const bad of ['', '{}', '{', JSON.stringify({ ...ring, active: 'missing' }), JSON.stringify({ active: 'x', keys: { x: 'short' } }), JSON.stringify({ ...ring, unexpected: true })]) assert.throws(() => createSessionTokenCodec(bad, context));
  for (const value of [null, JSON.stringify(tokens), 'synthetic-raw-token', 'v1.current.bad.bad.bad', 'x'.repeat(300000)]) assert.throws(() => codec().open(value, row), { code: 'session_token_protection_failed' });
  for (const value of [{ ...tokens, refresh_token: '' }, { ...tokens, extra: 'value' }, { ...tokens, access_token: 'x'.repeat(140000) }]) assert.throws(() => codec().seal(value, row));
});
test('startup requires the explicit validated database cutover', async () => {
  for (const rows of [[], [{ convalidated: false }]]) await assert.rejects(() => assertTokenStorageReady({ query: async () => ({ rows }) }), /cutover is required/);
  await assertTokenStorageReady({ query: async () => ({ rows: [{ convalidated: true }] }) });
});
