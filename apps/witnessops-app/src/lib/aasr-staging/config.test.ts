import assert from 'node:assert/strict';
import test from 'node:test';
import { aasrBuildProfile, stagingDatabaseTargetDigest } from './build-profile';
import { stagingRuntimeMatches } from './runtime-policy';
import { aasrStagingRouteAllowed } from './routes';

const origin = 'https://staging.example.test';
const database = 'postgresql://app_staging:non-secret-fixture@db:5432/aasr_staging';
const inputs = { WITNESSOPS_BUILD_PROFILE: 'aasr-staging', WITNESSOPS_STAGING_BUILD_ORIGIN: origin,
  WITNESSOPS_STAGING_BUILD_WORKOS_CLIENT_ID: 'client_staging_fixture', WITNESSOPS_STAGING_BUILD_DATABASE_SHA256: stagingDatabaseTargetDigest(database),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${origin}/callback` };
const build = aasrBuildProfile(inputs);
const runtime = { NODE_ENV: 'production', HOSTNAME: '0.0.0.0', PORT: '3020', WITNESSOPS_DEPLOYMENT_ENV: 'staging',
  WITNESSOPS_AASR_FIXTURE: '1', WITNESSOPS_APP_PROXY_MODE: 'caddy-aasr-staging-v1', NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${origin}/callback`,
  WORKOS_CLIENT_ID: build.workosClientId, WORKOS_API_KEY: 'sk_test_non_secret_fixture', WORKOS_COOKIE_PASSWORD: 'non-secret-fixture-cookie-over-32-characters',
  WORKOS_COOKIE_SAMESITE: 'lax', DATABASE_URL: database };

test('standard build ignores runtime-looking compiled overrides and requires explicit build selection', () => {
  assert.deepEqual(aasrBuildProfile({ WITNESSOPS_COMPILED_BUILD_PROFILE: 'aasr-staging', WITNESSOPS_AASR_FIXTURE: '1' }),
    { profile: 'standard', origin: '', workosClientId: '', databaseSha256: '' });
  assert.equal(stagingRuntimeMatches(aasrBuildProfile({}), runtime), false);
  assert.throws(() => aasrBuildProfile({ ...inputs, WITNESSOPS_BUILD_PROFILE: 'unknown' }));
  for (const key of Object.keys(inputs)) {
    if (key !== 'WITNESSOPS_BUILD_PROFILE') assert.throws(() => aasrBuildProfile({ ...inputs, [key]: '' }), key);
  }
  for (const badOrigin of ['https://app.witnessops.com', 'https://staging.example.test:444', 'http://staging.example.test', `${origin}/`, 'https://staging.example.test@evil.example']) {
    assert.throws(() => aasrBuildProfile({ ...inputs, WITNESSOPS_STAGING_BUILD_ORIGIN: badOrigin, NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${badOrigin}/callback` }));
  }
  assert.throws(() => aasrBuildProfile({ ...inputs, WITNESSOPS_APP_BROWSER_TEST: '1' }));
});

test('database binding excludes passwords but binds host, port, database and restricted staging role', () => {
  const digest = stagingDatabaseTargetDigest(database);
  assert.equal(stagingDatabaseTargetDigest(database.replace('non-secret-fixture', 'rotated-fixture')), digest);
  assert.equal(stagingDatabaseTargetDigest(database.replace(':5432', '')), digest);
  for (const changed of [database.replace('@db:', '@other-db:'), database.replace(':5432', ':5433'), database.replace('/aasr_staging', '/other_staging'), database.replace('app_staging:', 'other_staging:')]) {
    assert.notEqual(stagingDatabaseTargetDigest(changed), digest);
  }
  for (const invalid of [database + '?host=other', database + '#fragment', database.replace('/aasr_staging', '/production'), database.replace('app_staging:', 'postgres:'), database.replace('non-secret-fixture', ''), '']) {
    assert.throws(() => stagingDatabaseTargetDigest(invalid));
  }
});

test('staging runtime fails closed before login without exact reviewed identity and database bindings', () => {
  assert.equal(stagingRuntimeMatches(build, runtime), true);
  // Assignment is deliberately not a startup prerequisite: real native login
  // must precede the reviewed assignment transaction.
  assert.equal(stagingRuntimeMatches(build, { ...runtime, WITNESSOPS_AASR_STAGING_ASSIGNMENT_FILE: '' }), true);
  for (const key of Object.keys(runtime)) assert.equal(stagingRuntimeMatches(build, { ...runtime, [key]: '' }), false, key);
  for (const change of [
    { NODE_ENV: 'development' }, { WITNESSOPS_DEPLOYMENT_ENV: 'production' }, { WORKOS_CLIENT_ID: 'client_other' },
    { NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'https://app.witnessops.com/callback' }, { WORKOS_API_KEY: 'sk_live_fixture' },
    { DATABASE_URL: database.replace('@db:', '@production:') }, { WORKOS_COOKIE_DOMAIN: '.example.test' }, { WORKOS_COOKIE_SAMESITE: 'none' },
    { WITNESSOPS_APP_PROXY_MODE: 'caddy-loopback-v1' }, { WORKOS_API_HOSTNAME: 'localhost' }, { WORKOS_API_HTTPS: 'false' },
    { WORKOS_API_PORT: '8000' }, { WORKOS_CLAIM_TOKEN: 'fixture' }, { WITNESSOPS_APP_BROWSER_TEST: '1' },
    { DATABASE_MIGRATION_URL: database }, { TEST_DATABASE_URL: database }, { WITNESSOPS_FINALIZER_ENABLED: '1' },
    { WITNESSOPS_APP_HELP_ENABLED: '1' }, { WITNESSOPS_REPORT_EMAIL_ENABLED: '1' }, { WITNESSOPS_BILLING_SANDBOX: '1' },
    { WITNESSOPS_MAIL_PROVIDER: 'file' }, { WITNESSOPS_M365_CLIENT_SECRET: 'fixture' }, { OPENAI_API_KEY: 'fixture' },
    { STRIPE_SECRET_KEY: 'fixture' }, { WITNESSOPS_FINALIZER_KEY: 'fixture' }, { WITNESSOPS_REPORT_HOST_SUFFIX: 'example.test' },
    { WITNESSOPS_FREE_WORKSPACE_LIMIT: '2' }, { AWS_ACCESS_KEY_ID: 'fixture' }, { AWS_SECRET_ACCESS_KEY: 'fixture' },
    { AWS_SESSION_TOKEN: 'fixture' }, { RESEND_API_KEY: 'fixture' },
  ]) assert.equal(stagingRuntimeMatches(build, { ...runtime, ...change }), false, Object.keys(change).join());
});

test('staging route boundary includes native auth and page actions but excludes unrelated operations', () => {
  for (const path of ['/', '/aasr-fixture', '/aasr-fixture/']) for (const method of ['GET', 'HEAD', 'POST']) assert.equal(aasrStagingRouteAllowed(path, method), true);
  for (const path of ['/login', '/callback', '/_next/static/chunks/app.js', '/favicon.ico']) assert.equal(aasrStagingRouteAllowed(path, 'GET'), true);
  for (const path of ['/api/runs', '/api/assets', '/api/workspace', '/api/invitations', '/api/members', '/api/help', '/api/shares', '/api/shared-report', '/api/billing/webhook', '/api/cli/server-checks', '/s', '/signup', '/_next/image']) {
    for (const method of ['GET', 'POST', 'HEAD']) assert.equal(aasrStagingRouteAllowed(path, method), false, path);
  }
  assert.equal(aasrStagingRouteAllowed('/callback', 'POST'), false);
  assert.equal(aasrStagingRouteAllowed('/api/aasr-fixture', 'POST'), true);
  assert.equal(aasrStagingRouteAllowed('/api/aasr-fixture/', 'POST'), false);
  assert.equal(aasrStagingRouteAllowed('/aasr-fixture', 'DELETE'), false);
});
