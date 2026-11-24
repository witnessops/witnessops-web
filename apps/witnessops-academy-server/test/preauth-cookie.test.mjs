import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PREAUTH_TTL_MS,
  createPreauthCodec,
  openPreauth,
  preauthKeyFromSecret,
  sealPreauth,
} from '../src/preauth-cookie.mjs';

const key = preauthKeyFromSecret('a'.repeat(32));

test('a sealed login cookie round-trips and rejects tampering', () => {
  const payload = { state: 'state-value', nonce: 'nonce-value', verifier: 'verifier-value', id: 'id-1', exp: 5_000 };
  const token = sealPreauth(payload, key);
  assert.deepEqual(openPreauth(token, key, 4_000), payload);
  assert.equal(openPreauth(token, preauthKeyFromSecret('b'.repeat(32)), 4_000), null);
  const tampered = `${token.slice(0, -2)}aa`;
  assert.equal(openPreauth(tampered, key, 4_000), null);
});

test('an expired login cookie is rejected', () => {
  const token = sealPreauth({
    state: 'state-value', nonce: 'nonce-value', verifier: 'verifier-value', id: 'id-2', exp: 1_000,
  }, key);
  assert.equal(openPreauth(token, key, 1_000), null);
  assert.equal(PREAUTH_TTL_MS, 5 * 60 * 1000);
});

test('a replayed login cookie is rejected and the used-id set stays bounded', () => {
  const codec = createPreauthCodec(key, { ttlMs: 120_000, maxUsed: 2 });
  const first = codec.seal({ state: 's', nonce: 'n', verifier: 'v' }, 1_000);
  assert.equal(codec.open(first, 1_000)?.state, 's');
  assert.equal(codec.open(first, 1_000), null);
  const second = codec.seal({ state: 's2', nonce: 'n2', verifier: 'v2' }, 1_000);
  const third = codec.seal({ state: 's3', nonce: 'n3', verifier: 'v3' }, 1_000);
  assert.ok(codec.open(second, 1_000));
  assert.ok(codec.open(third, 1_000));
  assert.equal(codec.usedSize(), 2);
});

test('a preauth key shorter than 32 bytes is refused', () => {
  assert.throws(() => preauthKeyFromSecret('short-key'), /ACADEMY_PREAUTH_KEY must be at least 32 bytes/);
  assert.throws(() => preauthKeyFromSecret('a'.repeat(31)), /ACADEMY_PREAUTH_KEY must be at least 32 bytes/);
  assert.equal(preauthKeyFromSecret('a'.repeat(32)).length, 32);
});

test('sealed login context retains a lesson choice for an allowlisted callback return', () => {
  const codec = createPreauthCodec(key);
  const token = codec.seal({ state: 's', nonce: 'n', verifier: 'v', lessonId: 'same-scope' });
  assert.equal(codec.open(token).lessonId, 'same-scope');
});

test('invitation context is encrypted, authenticated and single-use with login', () => {
  const codec = createPreauthCodec(key);
  const invitationToken = 'x'.repeat(43);
  const token = codec.seal({ state: 's', nonce: 'n', verifier: 'v', invitationToken });
  assert.equal(token.includes(invitationToken), false);
  assert.equal(codec.open(token).invitationToken, invitationToken);
  assert.equal(codec.open(token), null);
});

test('account and registration intent are sealed while arbitrary return URLs are excluded', () => {
  const codec = createPreauthCodec(key);
  const token = codec.seal({ state: 's', nonce: 'n', verifier: 'v', returnTo: 'account', registration: true });
  const context = codec.open(token);
  assert.equal(context.returnTo, 'account');
  assert.equal(context.registration, true);
  assert.equal(codec.open(token), null);
  for (const returnTo of ['https://outsider.example.invalid/', '//outsider.example.invalid/', '/academy/account', 'lesson']) {
    const rejected = codec.open(codec.seal({ state: 's', nonce: 'n', verifier: 'v', returnTo, registration: 'true' }));
    assert.equal(Object.hasOwn(rejected, 'returnTo'), false);
    assert.equal(Object.hasOwn(rejected, 'registration'), false);
  }
});
