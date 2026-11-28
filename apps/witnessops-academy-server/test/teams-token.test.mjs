import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';
import {
  createTeamsTokenVerifier,
  TEAMS_CLIENT_IDS,
  TeamsTokenError,
  teamsSsoEnabled,
} from '../src/teams-token.mjs';

const TENANT_ID = '11111111-2222-4333-8444-abcdefabcdef';
const APP_ID = '22222222-3333-4444-8555-bcdefabcdefa';
const OBJECT_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const SUBJECT = 'XkjgWjdmaZ-_xDmhgN1BMP2vL2YOfeVxfPT_o8GRWaw';
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const JWKS_URL = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;
const NOW = 2_000_000_000;
const KID = 'synthetic-key-1';

const signing = await generateKeyPair('RS256', { extractable: true });
const otherSigning = await generateKeyPair('RS256', { extractable: true });
const publicJwk = { ...(await exportJWK(signing.publicKey)), alg: 'RS256', kid: KID, use: 'sig' };

function jwksFetch({ status = 200, body = { keys: [publicJwk] }, onRequest } = {}) {
  return async (url) => {
    onRequest?.(String(url));
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function verifier(options = {}) {
  return createTeamsTokenVerifier({
    tenantId: TENANT_ID,
    appId: APP_ID,
    fetchImpl: jwksFetch(),
    now: () => new Date(NOW * 1000),
    ...options,
  });
}

async function signedToken(overrides = {}, { header = {}, key = signing.privateKey } = {}) {
  const payload = {
    iss: ISSUER,
    aud: APP_ID,
    tid: TENANT_ID,
    ver: '2.0',
    oid: OBJECT_ID,
    sub: SUBJECT,
    azp: TEAMS_CLIENT_IDS[1],
    scp: 'openid profile access_as_user',
    iat: NOW - 5,
    nbf: NOW - 5,
    exp: NOW + 3_600,
    ...overrides,
  };
  for (const [name, value] of Object.entries(payload)) {
    if (value === undefined) delete payload[name];
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: KID, ...header })
    .sign(key);
}

function encoded(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function replaceHeader(token, header) {
  const [, payload, signature] = token.split('.');
  return `${encoded(header)}.${payload}.${signature}`;
}

async function expectDenial(promise, code, status) {
  await assert.rejects(promise, error => {
    assert.equal(error instanceof TeamsTokenError, true);
    assert.equal(error.name, 'TeamsTokenError');
    assert.equal(error.message, code);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    assert.deepEqual(Object.keys(error).sort(), ['code', 'name', 'status']);
    return true;
  });
}

test('Teams SSO is off by default and accepts only exact boolean strings', () => {
  assert.equal(teamsSsoEnabled(), false);
  assert.equal(teamsSsoEnabled('false'), false);
  assert.equal(teamsSsoEnabled('true'), true);
  for (const value of ['', 'TRUE', '1', true, null]) {
    assert.throws(() => teamsSsoEnabled(value), /Invalid Academy Teams SSO setting/);
  }
});

test('configuration requires canonical non-nil tenant and application UUIDs', () => {
  for (const [tenantId, appId] of [
    ['bad', APP_ID],
    [TENANT_ID.toUpperCase(), APP_ID],
    ['00000000-0000-0000-0000-000000000000', APP_ID],
    [TENANT_ID, 'bad'],
    [TENANT_ID, APP_ID.toUpperCase()],
  ]) {
    assert.throws(() => createTeamsTokenVerifier({ tenantId, appId }), /Invalid Academy Teams/);
  }
});

test('valid token uses the fixed tenant JWKS URL and returns identity fields only', async () => {
  const requested = [];
  const verify = verifier({ fetchImpl: jwksFetch({ onRequest: value => requested.push(value) }) });
  const identity = await verify(await signedToken());
  assert.deepEqual(requested, [JWKS_URL]);
  assert.deepEqual(identity, {
    tenantId: TENANT_ID,
    objectId: OBJECT_ID,
    subject: SUBJECT,
  });
  assert.deepEqual(Object.keys(identity).sort(), ['objectId', 'subject', 'tenantId']);
});

test('both documented Teams clients are accepted', async () => {
  for (const azp of TEAMS_CLIENT_IDS) {
    assert.equal((await verifier()(await signedToken({ azp }))).objectId, OBJECT_ID);
  }
});

test('compact JWT and protected header are strictly bounded', async () => {
  const good = await signedToken();
  const [, payload, signature] = good.split('.');
  const cases = [
    '',
    'not-a-jwt',
    `a.${payload}.${signature}`,
    'a'.repeat(16_385),
    replaceHeader(good, { alg: 'PS256', kid: KID }),
    replaceHeader(good, { alg: 'RS256' }),
    replaceHeader(good, { alg: 'RS256', kid: 'x'.repeat(129) }),
    replaceHeader(good, { alg: 'RS256', kid: KID, jwk: publicJwk }),
    replaceHeader(good, { alg: 'RS256', kid: KID, jku: 'https://attacker.invalid/jwks' }),
    replaceHeader(good, { alg: 'RS256', kid: KID, x5u: 'https://attacker.invalid/cert' }),
    replaceHeader(good, { alg: 'RS256', kid: KID, crit: [] }),
  ];
  for (const token of cases) await expectDenial(verifier()(token), 'invalid_token', 401);
});

test('signature, issuer, audience, tenant and token-version mismatches are invalid', async () => {
  const cases = [
    signedToken({}, { key: otherSigning.privateKey }),
    signedToken({ iss: 'https://login.microsoftonline.com/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/v2.0' }),
    signedToken({ aud: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }),
    signedToken({ aud: [APP_ID, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'] }),
    signedToken({ tid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }),
    signedToken({ ver: '1.0' }),
  ];
  for (const pending of cases) await expectDenial(verifier()(await pending), 'invalid_token', 401);
});

test('identity and actor claims must be bounded delegated-user values', async () => {
  const cases = [
    { oid: 'not-a-uuid' },
    { oid: '00000000-0000-0000-0000-000000000000' },
    { sub: '' },
    { sub: 'x'.repeat(257) },
    { sub: 'has a space' },
    { azp: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
    { idtyp: 'app' },
    { scp: ['access_as_user'] },
  ];
  for (const claims of cases) {
    await expectDenial(verifier()(await signedToken(claims)), 'invalid_token', 401);
  }
});

test('a valid delegated token without access_as_user is insufficient scope', async () => {
  for (const scp of [undefined, '', 'openid profile', 'access_as_users']) {
    await expectDenial(verifier()(await signedToken({ scp })), 'insufficient_scope', 403);
  }
});

test('numeric dates are required, current, ordered and limited to 29 hours', async () => {
  const invalidClaims = [
    { iat: undefined },
    { nbf: undefined },
    { exp: undefined },
    { iat: String(NOW - 5) },
    { nbf: String(NOW - 5) },
    { exp: String(NOW + 3_600) },
    { iat: NOW + 61, nbf: NOW, exp: NOW + 3_600 },
    { iat: NOW - 5, nbf: NOW - 5, exp: NOW - 61 },
    { iat: NOW - 5, nbf: NOW - 5, exp: NOW - 5 },
    { iat: NOW - 5, nbf: NOW - 5, exp: NOW - 5 + (29 * 60 * 60) + 1 },
  ];
  for (const claims of invalidClaims) {
    await expectDenial(verifier()(await signedToken(claims)), 'invalid_token', 401);
  }

  const identity = await verifier()(await signedToken({
    iat: NOW - 5,
    nbf: NOW - 5,
    exp: NOW - 5 + (29 * 60 * 60),
  }));
  assert.equal(identity.subject, SUBJECT);
});

test('JWKS network, timeout-class and 5xx failures are provider unavailable', async () => {
  const throwingFetch = async () => { throw new TypeError('synthetic network failure'); };
  await expectDenial(
    verifier({ fetchImpl: throwingFetch })(await signedToken()),
    'identity_provider_unavailable',
    503,
  );
  await expectDenial(
    verifier({ fetchImpl: jwksFetch({ status: 503, body: { error: 'synthetic outage' } }) })(await signedToken()),
    'identity_provider_unavailable',
    503,
  );
  await expectDenial(
    verifier({ fetchImpl: jwksFetch({ status: 429, body: { error: 'synthetic throttle' } }) })(await signedToken()),
    'identity_provider_unavailable',
    503,
  );
});

test('a JWKS 4xx response and unknown signing key remain invalid token', async () => {
  await expectDenial(
    verifier({ fetchImpl: jwksFetch({ status: 404, body: { error: 'missing' } }) })(await signedToken()),
    'invalid_token',
    401,
  );
  await expectDenial(
    verifier({ fetchImpl: jwksFetch({ body: { keys: [] } }) })(await signedToken()),
    'invalid_token',
    401,
  );
});

test('a prior provider response cannot reclassify a later malformed token', async () => {
  let status = 503;
  const fetchImpl = async () => new Response(status === 503
    ? JSON.stringify({ error: 'synthetic outage' })
    : JSON.stringify({ keys: [publicJwk] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  const verify = verifier({ fetchImpl });
  await expectDenial(verify(await signedToken()), 'identity_provider_unavailable', 503);
  status = 200;
  await expectDenial(verify('bad'), 'invalid_token', 401);
});
