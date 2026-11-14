import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHttpBindIsLoopback } from '../src/listen-policy.mjs';

test('http on a non-loopback listen address is refused', () => {
  assert.throws(
    () => assertHttpBindIsLoopback('0.0.0.0', 'http://127.0.0.1:18300'),
    /ACADEMY_APP_HOST must be loopback when ACADEMY_PUBLIC_ORIGIN is http/,
  );
  assert.throws(
    () => assertHttpBindIsLoopback('203.0.113.10', 'http://203.0.113.10:18300'),
    /ACADEMY_APP_HOST must be loopback when ACADEMY_PUBLIC_ORIGIN is http/,
  );
});

test('loopback http and https on any listen address are accepted', () => {
  assert.doesNotThrow(() => assertHttpBindIsLoopback('127.0.0.1', 'http://127.0.0.1:18300'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('::1', 'http://[::1]:18300'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('localhost', 'http://localhost:18300'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('0.0.0.0', 'https://example.invalid'));
});
