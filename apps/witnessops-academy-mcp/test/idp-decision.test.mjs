import assert from 'node:assert/strict';
import test from 'node:test';
import { authDenial, introspectionFailure, isIdpUnreachable, jwtFailure } from '../src/idp-decision.mjs';

test('a refused identity-provider connection is 503 and does not start a login challenge', async () => {
  let caught;
  try {
    await fetch('http://127.0.0.1:59991/realms/academy/.well-known/openid-configuration', {
      signal: AbortSignal.timeout(1000),
    });
  } catch (error) {
    caught = error;
  }
  assert.equal(isIdpUnreachable(caught), true);
  const denial = authDenial(jwtFailure(caught));
  assert.equal(denial.status, 503);
  assert.equal(denial.challenge, false);
  assert.equal(denial.body.error, 'idp_unavailable');
  assert.equal(Object.hasOwn(denial.headers, 'WWW-Authenticate'), false);
  assert.match(denial.headers['Retry-After'], /^[1-9][0-9]*$/);
});

test('a JWKS timeout is unavailable and does not challenge', () => {
  const timeout = new Error('jwks timed out');
  timeout.name = 'TimeoutError';
  timeout.cause = Object.assign(new Error('fetch failed'), { code: 'UND_ERR_CONNECT_TIMEOUT' });
  const denial = authDenial(jwtFailure(timeout));
  assert.equal(denial.status, 503);
  assert.equal(denial.challenge, false);
  assert.equal(Object.hasOwn(denial.headers, 'WWW-Authenticate'), false);
});

test('an invalid token stays a bearer challenge', () => {
  const denial = authDenial(jwtFailure({ code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' }));
  assert.equal(denial.status, 401);
  assert.equal(denial.challenge, true);
  assert.equal(denial.error, 'invalid_token');
});

test('an introspection 5xx is unavailable and an inactive token is not', () => {
  const claims = { sub: 'learner', iss: 'https://idp.example/realms/academy' };
  const down = authDenial(introspectionFailure({
    status: 503,
    body: {},
    claims,
    resourceMatches: true,
  }));
  assert.equal(down.status, 503);
  assert.equal(down.challenge, false);
  assert.equal(Object.hasOwn(down.headers, 'WWW-Authenticate'), false);
  const inactive = introspectionFailure({
    status: 200,
    body: { active: false, sub: claims.sub, iss: claims.iss },
    claims,
    resourceMatches: true,
  });
  assert.equal(inactive.status, 401);
  assert.equal(inactive.challenge, true);
  assert.equal(authDenial(introspectionFailure({ thrown: true, claims, resourceMatches: false })).status, 503);
});
