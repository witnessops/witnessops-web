import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHttpBindIsLoopback } from '../src/listen-policy.mjs';

test('0.0.0.0 and :: are refused unless public bind is allowed', () => {
  for (const host of ['0.0.0.0', '::', '[::]']) {
    assert.throws(
      () => assertHttpBindIsLoopback(host, false),
      /MCP_HOST must be a loopback address unless MCP_ALLOW_PUBLIC_BIND=1/,
    );
  }
  assert.doesNotThrow(() => assertHttpBindIsLoopback('0.0.0.0', true));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('::', true));
});

test('loopback binds are accepted without the public opt-in', () => {
  for (const host of ['127.0.0.1', '::1', '[::1]', 'localhost']) {
    assert.doesNotThrow(() => assertHttpBindIsLoopback(host, false));
  }
});
