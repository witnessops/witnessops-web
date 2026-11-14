import assert from 'node:assert/strict';
import test from 'node:test';
import { ResponseBodyError } from 'openid-client';
import { idpFailureAction } from '../src/idp-decision.mjs';

function oauthError(code) {
  return new ResponseBodyError('token endpoint rejected the grant', {
    cause: { error: code },
    response: new Response('{}', { status: 400 }),
  });
}

test('only an authoritative invalid grant revokes the session', () => {
  assert.equal(idpFailureAction(oauthError('invalid_grant')), 'revoke');
  assert.equal(idpFailureAction(oauthError('invalid_token')), 'revoke');
  assert.equal(idpFailureAction(oauthError('server_error')), 'unavailable');
  assert.equal(idpFailureAction(Object.assign(new TypeError('fetch failed'), { code: 'ECONNREFUSED' })), 'unavailable');
  assert.equal(idpFailureAction(new Error('network down')), 'unavailable');
});
