import assert from 'node:assert/strict';
import test from 'node:test';
import { openPreauth, preauthKeyFromSecret, sealPreauth } from '../src/preauth-cookie.mjs';

const key = preauthKeyFromSecret('synthetic-preauth-secret');

test('a sealed login cookie round-trips and rejects tampering or expiry', () => {
  const payload = { state: 'state-value', nonce: 'nonce-value', verifier: 'verifier-value', exp: 5_000 };
  const token = sealPreauth(payload, key);
  assert.deepEqual(openPreauth(token, key, 4_000), payload);
  assert.equal(openPreauth(token, key, 5_000), null);
  assert.equal(openPreauth(token, preauthKeyFromSecret('other-secret'), 4_000), null);
  const tampered = `${token.slice(0, -2)}aa`;
  assert.equal(openPreauth(tampered, key, 4_000), null);
  assert.equal(openPreauth('', key, 4_000), null);
});
