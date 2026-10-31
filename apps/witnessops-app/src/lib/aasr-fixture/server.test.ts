import test from 'node:test';
import assert from 'node:assert/strict';
import { aasrFixtureEnabled } from './guard';
import { createAasrFixtureService } from './server';
import { AASR_FIXTURE_PATH, AASR_FIXTURE_WORKSPACE_ID } from './contract';
const origin = 'http://127.0.0.1:3022';
function request(method = 'GET', body?: string, extra: Record<string, string> = {}) {
  return new Request(origin + AASR_FIXTURE_PATH, { method, headers: { host: '127.0.0.1:3022', origin, 'content-type': 'application/json', 'x-witnessops-workspace': AASR_FIXTURE_WORKSPACE_ID, ...extra }, ...(body ? { body } : {}) });
}
test('fixture defaults off and production cannot enable it', () => {
  assert.equal(aasrFixtureEnabled({}), false);
  assert.equal(aasrFixtureEnabled({ NODE_ENV: 'test', WITNESSOPS_AASR_FIXTURE: '1' }), true);
  assert.equal(aasrFixtureEnabled({ NODE_ENV: 'production', WITNESSOPS_AASR_FIXTURE: '1' }), false);
});
test('disabled requests refuse before identity or database access', async () => {
  let calls = 0;
  const service = createAasrFixtureService({ enabled: () => false, identity: async () => { calls++; throw Error('must not run'); } });
  assert.equal((await service(request())).status, 404);
  assert.equal((await service(request('POST', '{"command":"accept_scope","expectedRevision":0}'))).status, 404);
  assert.equal(calls, 0);
});
test('strict admission rejects caller roles, duplicate keys, oversized and encoded inputs before identity', async () => {
  let calls = 0;
  const service = createAasrFixtureService({ enabled: () => true, origin, identity: async () => { calls++; return null; } });
  for (const body of [
    '{"command":"accept_scope","expectedRevision":0,"role":"reviewer"}',
    '{"command":"accept_scope","command":"record_review","expectedRevision":0}',
    JSON.stringify({ command: 'x'.repeat(2048), expectedRevision: 0 }),
    '{"command":"accept_scope","expectedRevision":-1}',
    '{"command":"accept_scope","expectedRevision":0,"url":"https://example.test"}',
  ]) assert.equal((await service(request('POST', body))).status, 400);
  assert.equal((await service(request('POST', '{}', { 'content-encoding': 'gzip' }))).status, 400);
  assert.equal(calls, 0);
});
test('origin, query, workspace and absent identity fail closed', async () => {
  const service = createAasrFixtureService({ enabled: () => true, origin, identity: async () => null });
  assert.equal((await service(request('GET', undefined, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await service(request('GET', undefined, { 'x-witnessops-workspace': 'other-tenant' }))).status, 400);
  assert.equal((await service(request('GET', undefined, { 'x-witnessops-workspace': '11000000-0000-4000-8000-000000000002' }))).status, 404);
  const base = request();
  assert.equal((await service(new Request(base.url + '?actor=reviewer', base))).status, 400);
  const response = await service(request('GET', undefined, { 'x-reviewer': 'true' }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
