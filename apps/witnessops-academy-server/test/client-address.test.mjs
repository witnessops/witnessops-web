import assert from 'node:assert/strict';
import test from 'node:test';
import { clientAddress } from '../src/client-address.mjs';

test('X-Forwarded-For is ignored unless the socket peer is a configured proxy', () => {
  const trusted = ['192.0.2.10'];
  assert.equal(clientAddress({
    remoteAddress: '198.51.100.20',
    forwardedFor: '203.0.113.5',
  }, trusted), '198.51.100.20');
  assert.equal(clientAddress({
    remoteAddress: '::ffff:192.0.2.10',
    forwardedFor: '203.0.113.5, 192.0.2.10',
  }, trusted), '203.0.113.5');
  assert.equal(clientAddress({
    remoteAddress: '192.0.2.10',
    forwardedFor: '',
  }, trusted), '192.0.2.10');
});
