import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import * as jose from 'jose';
import { authDenial, introspectionFailure, isIdpUnreachable, jwtFailure } from '../src/idp-decision.mjs';
import { createRemoteJwks } from '../src/jwks-client.mjs';

const SAMPLE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IngtMSJ9.eyJzdWIiOiJsZWFybmVyIiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6Imh0dHA6Ly8xMjcuMC4wLjE6NTk5OTEvcmVhbG1zL2FjYWRlbXkiLCJhdWQiOiJodHRwOi8vMTI3LjAuMC4xOjE4NTAwL21jcCJ9.c2ln';

function listen(status, body) {
  const server = http.createServer((req, res) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

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
  const generic = jwtFailure({ code: 'ERR_JOSE_GENERIC' });
  assert.equal(generic.status, 401);
  assert.equal(generic.challenge, true);
});

test('a JWKS endpoint returning 503 is unavailable and a 404 stays a challenge', async () => {
  const down = await listen(503, '{"error":"unavailable"}');
  const missing = await listen(404, '{"error":"missing"}');
  try {
    const downJwks = createRemoteJwks(new URL(`http://127.0.0.1:${down.address().port}/certs`));
    let downError;
    try {
      await jose.jwtVerify(SAMPLE_TOKEN, downJwks.keys, { algorithms: ['RS256'] });
    } catch (error) {
      downError = error;
    }
    assert.equal(downError.code, 'ERR_JOSE_GENERIC');
    assert.equal(downJwks.status(), 503);
    const denial = authDenial(jwtFailure(downError, { jwksStatus: downJwks.status() }));
    assert.equal(denial.status, 503);
    assert.equal(denial.challenge, false);
    assert.equal(Object.hasOwn(denial.headers, 'WWW-Authenticate'), false);
    assert.match(denial.headers['Retry-After'], /^[1-9][0-9]*$/);

    const missingJwks = createRemoteJwks(new URL(`http://127.0.0.1:${missing.address().port}/certs`));
    let missingError;
    try {
      await jose.jwtVerify(SAMPLE_TOKEN, missingJwks.keys, { algorithms: ['RS256'] });
    } catch (error) {
      missingError = error;
    }
    assert.equal(missingJwks.status(), 404);
    const missingDenial = authDenial(jwtFailure(missingError, { jwksStatus: missingJwks.status() }));
    assert.equal(missingDenial.status, 401);
    assert.equal(missingDenial.challenge, true);
  } finally {
    down.close();
    missing.close();
  }
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
