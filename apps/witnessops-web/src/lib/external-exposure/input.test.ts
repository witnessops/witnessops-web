import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExternalHostname, UnsafeTargetError } from './input';

test('normalizes whitespace, case, one trailing dot and IDNA', () => {
  assert.equal(normalizeExternalHostname(' WWW.WitnessOps.COM. '), 'www.witnessops.com');
  assert.equal(normalizeExternalHostname('BÜCHER.de'), 'xn--bcher-kva.de');
});

test('rejects URL syntax, addresses, credentials, ports, local and malformed names', () => {
  for (const value of [undefined, {}, '', 'https://public.com', 'public.com/path', 'public.com:443', 'a@public.com',
    'public.com?x=1', 'public.com#x', 'public.com\\x', 'public.com..', '.public.com', '-a.com', 'a-.com',
    'a_b.com', `${'a'.repeat(64)}.com`, '127.0.0.1', '[::1]', '::1', '0x7f000001', '2130706433', '127.1',
    'localhost', 'a.localhost', 'a.local', 'a.internal', 'a.home', 'a.lan', 'a.test', 'a.invalid', 'a.example',
    'a.onion', 'a.alt', 'a.arpa', 'a b.com', 'public%2ecom']) {
    assert.throws(() => normalizeExternalHostname(value), UnsafeTargetError, String(value));
  }
});
