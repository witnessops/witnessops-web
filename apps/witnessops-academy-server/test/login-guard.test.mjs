import assert from 'node:assert/strict';
import test from 'node:test';
import { createLoginGuard, startLoginSweep } from '../src/login-guard.mjs';

test('a burst cannot grow pre-login state past the cap, and the next start is 429', () => {
  const guard = createLoginGuard({ maxEntries: 4, maxPerWindow: 100, windowMs: 60_000 });
  const now = 1_000_000;
  let allowed = 0;
  let limited = 0;
  for (let i = 0; i < 50; i += 1) {
    const decision = guard.begin(`203.0.113.${i}`, now);
    if (decision.ok) {
      assert.equal(guard.put(`key-${i}`, { exp: now + 60_000 }), true);
      allowed += 1;
    } else {
      assert.equal(decision.status, 429);
      limited += 1;
    }
  }
  assert.equal(guard.size(), 4);
  assert.equal(allowed, 4);
  assert.equal(limited, 46);
  assert.equal(guard.begin('203.0.113.99', now).status, 429);
});

test('login starts past the window limit return 429 without storing more state', () => {
  const guard = createLoginGuard({ maxEntries: 100, maxPerWindow: 3, windowMs: 60_000 });
  const now = 5_000;
  assert.equal(guard.begin('198.51.100.10', now).ok, true);
  assert.equal(guard.begin('198.51.100.10', now + 1).ok, true);
  assert.equal(guard.begin('198.51.100.10', now + 2).ok, true);
  assert.equal(guard.begin('198.51.100.10', now + 3).status, 429);
  assert.equal(guard.size(), 0);
  assert.equal(guard.begin('198.51.100.11', now + 4).ok, true);
});

test('the sweep timer drops expired pre-login entries', async () => {
  const guard = createLoginGuard({ maxEntries: 4, maxPerWindow: 10, windowMs: 1_000 });
  const timer = startLoginSweep(guard, 20);
  try {
    const now = Date.now();
    assert.equal(guard.begin('192.0.2.1', now).ok, true);
    assert.equal(guard.put('soon', { exp: now + 30 }), true);
    assert.equal(guard.size(), 1);
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(guard.size(), 0);
  } finally {
    clearInterval(timer);
  }
});
