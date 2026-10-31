import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { stagingDatabaseTargetDigest } from './build-profile';

// Source-level contract simulation only. Actual compiled-image invariance is
// separate acceptance; no provider/network/database calls occur in this file.
const origin = 'https://staging.example.test';
const database = 'postgresql://app_staging:non-secret-fixture@db:5432/aasr_staging';
const values = {
  NODE_ENV: 'production', HOSTNAME: '0.0.0.0', PORT: '3020', WITNESSOPS_DEPLOYMENT_ENV: 'staging',
  WITNESSOPS_AASR_FIXTURE: '1', WITNESSOPS_APP_PROXY_MODE: 'caddy-aasr-staging-v1',
  WITNESSOPS_COMPILED_BUILD_PROFILE: 'aasr-staging', WITNESSOPS_COMPILED_STAGING_ORIGIN: origin,
  WITNESSOPS_COMPILED_STAGING_WORKOS_CLIENT_ID: 'client_staging_fixture',
  WITNESSOPS_COMPILED_STAGING_DATABASE_SHA256: stagingDatabaseTargetDigest(database),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${origin}/callback`, WORKOS_CLIENT_ID: 'client_staging_fixture',
  WORKOS_API_KEY: 'sk_test_non_secret_fixture', WORKOS_COOKIE_PASSWORD: 'non-secret-fixture-cookie-over-32-characters',
  WORKOS_COOKIE_SAMESITE: 'lax', DATABASE_URL: database,
};
const saved = new Map(Object.keys(values).map(key => [key, process.env[key]]));
let boundary: typeof import('./routes').aasrStagingRequestBoundary;
let admission: typeof import('../server').admitRequest;
before(async () => {
  Object.assign(process.env, values);
  boundary = (await import('./routes')).aasrStagingRequestBoundary;
  admission = (await import('../server')).admitRequest;
});
after(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function request(path = '/api/aasr-fixture', overrides: Record<string, string> = {}, method = 'GET') {
  return new Request(`https://0.0.0.0:3020${path}`, { method, headers: {
    host: 'staging.example.test', 'x-forwarded-host': 'staging.example.test', 'x-forwarded-proto': 'https', ...overrides,
  } });
}

test('staging proxy admits only its sealed origin and does not broaden the production proxy mode', () => {
  assert.doesNotThrow(() => admission(request(), origin, 'caddy-aasr-staging-v1'));
  assert.throws(() => admission(request(), origin, 'caddy-loopback-v1'));
  assert.throws(() => admission(request(), 'https://app.witnessops.com', 'caddy-aasr-staging-v1'));
  const rejectedHeaders: Record<string, string>[] = [
    { host: 'evil.example' }, { 'x-forwarded-host': 'evil.example' }, { 'x-forwarded-proto': 'http' },
    { 'x-forwarded-proto': 'https,http' }, { forwarded: 'host=staging.example.test;proto=https' },
    { origin: 'https://app.witnessops.com' }, { 'sec-fetch-site': 'cross-site' },
  ];
  for (const overrides of rejectedHeaders) assert.throws(() => admission(request('/api/aasr-fixture', overrides), origin, 'caddy-aasr-staging-v1'));
  for (const key of ['host', 'x-forwarded-host', 'x-forwarded-proto']) {
    const candidate = request(); candidate.headers.delete(key);
    assert.throws(() => admission(candidate, origin, 'caddy-aasr-staging-v1'));
  }
  assert.throws(() => admission(new Request(`${origin}/api/aasr-fixture`, { headers: { host: 'staging.example.test' } }), origin, 'caddy-aasr-staging-v1'));
});

test('staging callback preserves cross-site navigation and code/state for native PKCE validation', () => {
  const callback = request('/callback?code=synthetic-code&state=synthetic-state', { 'sec-fetch-site': 'cross-site' });
  assert.equal(boundary(callback), undefined);
  assert.equal(new URL(callback.url).searchParams.get('code'), 'synthetic-code');
  assert.equal(callback.headers.get('sec-fetch-site'), 'cross-site');
  assert.equal(boundary(request('/login')), undefined);
  assert.equal(boundary(request('/_next/static/chunks/app.js')), undefined);
});

test('staging rejects unrelated routes before runtime auth or legacy public-route bypasses', () => {
  for (const path of ['/api/runs', '/api/members', '/api/billing/webhook', '/api/shared-report', '/s', '/api/cli/server-checks']) {
    assert.equal(boundary(request(path, {}, 'POST'))?.status, 404);
  }
  assert.equal(boundary(request('/aasr-fixture', { origin }, 'POST')), undefined);
  const rejectedHeaders: Record<string, string>[] = [{}, { origin: 'https://evil.example' }, { origin, 'sec-fetch-site': 'cross-site' }];
  for (const overrides of rejectedHeaders) {
    assert.equal(boundary(request('/aasr-fixture', overrides, 'POST'))?.status, 403);
  }
});

test('invalid staging runtime cannot enter login, static assets or fixture, while denied paths stay 404', () => {
  process.env.WORKOS_CLIENT_ID = 'client_wrong';
  try {
    for (const path of ['/login', '/callback', '/_next/static/chunks/app.js', '/api/aasr-fixture']) assert.equal(boundary(request(path))?.status, 503);
    assert.equal(boundary(request('/api/runs'))?.status, 404);
    assert.throws(() => admission(request(), origin, 'caddy-aasr-staging-v1'));
  } finally { process.env.WORKOS_CLIENT_ID = values.WORKOS_CLIENT_ID; }
});
