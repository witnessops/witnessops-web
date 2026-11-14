import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHttpBindIsLoopback } from '../src/listen-policy.mjs';

test('plain http refuses a non-loopback bind', () => {
  assert.throws(
    () => assertHttpBindIsLoopback('0.0.0.0', 'http://127.0.0.1:18500/mcp'),
    /MCP_HOST must be loopback when MCP_RESOURCE_URL is http/,
  );
  assert.throws(
    () => assertHttpBindIsLoopback('203.0.113.10', 'http://203.0.113.10:18500/mcp'),
    /MCP_HOST must be loopback when MCP_RESOURCE_URL is http/,
  );
});

test('loopback http and https binds are accepted', () => {
  assert.doesNotThrow(() => assertHttpBindIsLoopback('127.0.0.1', 'http://127.0.0.1:18500/mcp'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('::1', 'http://[::1]:18500/mcp'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('localhost', 'http://localhost:18500/mcp'));
  assert.doesNotThrow(() => assertHttpBindIsLoopback('127.0.0.1', 'https://example.invalid/mcp'));
});
