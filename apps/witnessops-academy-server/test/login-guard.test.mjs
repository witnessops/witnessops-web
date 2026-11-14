import assert from 'node:assert/strict';
import test from 'node:test';
import { createLoginGuard, startLoginSweep } from '../src/login-guard.mjs';

test('one client hitting the limit does not block a different client', () => {
  const guard = createLoginGuard({ maxPerWindow: 2, windowMs: 60_000 });
  const now = 10_000;
  assert.equal(guard.begin('203.0.113.1', now).ok, true);
  assert.equal(guard.begin('203.0.113.1', now + 10).ok, true);
  const limited = guard.begin('203.0.113.1', now + 20);
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfter, 60);
  assert.equal(guard.begin('203.0.113.2', now + 20).ok, true);
  assert.equal(guard.clients(), 2);
});

test('Retry-After is the remaining lockout, not a fixed minute', () => {
  const guard = createLoginGuard({ maxPerWindow: 1, windowMs: 10_000 });
  const now = 1_000_000;
  assert.equal(guard.begin('198.51.100.8', now).ok, true);
  const limited = guard.begin('198.51.100.8', now + 2500);
  assert.equal(limited.retryAfter, 8);
});

test('the sweep timer clears an expired client window', async () => {
  const guard = createLoginGuard({ maxPerWindow: 1, windowMs: 40 });
  const timer = startLoginSweep(guard, 20);
  try {
    assert.equal(guard.begin('192.0.2.8', Date.now()).ok, true);
    assert.equal(guard.clients(), 1);
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal(guard.clients(), 0);
    assert.equal(guard.begin('192.0.2.8', Date.now()).ok, true);
  } finally {
    clearInterval(timer);
  }
});
