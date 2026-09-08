import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { snapshotFixture } from '../../../../../tests/external-exposure/fixture';
import { createExternalExposureHandler, readExternalRequestBody } from './request';

let sequence = 0;
const namespace = () => `external-request-test-${++sequence}`;
function request(hostname = 'example.com', options: { body?: string; origin?: string; query?: string; headers?: Record<string, string> } = {}) {
  return new Request(`http://localhost:3001/api/external-exposure${options.query ?? ''}`, {
    method: 'POST', headers: { host: 'localhost:3001', origin: options.origin ?? 'http://localhost:3001', 'content-type': 'application/json', ...options.headers },
    body: options.body ?? JSON.stringify({ hostname }),
  });
}
const success = async (hostname: string) => snapshotFixture(hostname);

test('same-origin JSON request returns source-identical unsigned model and private response headers', async () => {
  const handler = createExternalExposureHandler(success, { namespace: namespace() });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  const { model, snapshot } = await response.json();
  assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), model.identity.sourceDigest);
  assert.deepEqual(model.sourceArtifacts[0].content, snapshot);
});

test('browser-facing Host admits loopback when Next Request.url uses its internal bind hostname', async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  const response = await handler(request('127.0.0.1', { origin: 'http://127.0.0.1:3001', headers: { host: '127.0.0.1:3001', 'sec-fetch-site': 'same-origin' } }));
  assert.equal(response.status, 400, 'The origin passes; the invalid target is then rejected without collection');
  assert.equal(calls, 0);
});

test('canonical HTTPS origin and matching Host work behind an internal HTTP reverse proxy', async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  const response = await handler(new Request('http://localhost:8080/api/external-exposure', {
    method: 'POST', headers: { host: 'witnessops.com', origin: 'https://witnessops.com', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({ hostname: '127.0.0.1' }),
  }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

for (const [label, headers] of [
  ['mismatched Host', { host: 'other.example.com' }],
  ['preview Host and Origin mismatch', { host: '127.0.0.1:3001', origin: 'http://localhost:3001' }],
  ['mismatched port', { host: 'localhost:3999', origin: 'http://localhost:3999' }],
  ['matching arbitrary authority', { host: 'other.example.com', origin: 'https://other.example.com' }],
  ['forwarded host spoof', { origin: 'https://witnessops.com', 'x-forwarded-host': 'witnessops.com', 'x-forwarded-proto': 'https' }],
  ['remote forwarded host spoof', { origin: 'https://other.example.com', 'x-forwarded-host': 'other.example.com', 'x-forwarded-proto': 'https' }],
  ['insecure public scheme', { host: 'witnessops.com', origin: 'http://witnessops.com' }],
  ['credentialed origin', { origin: 'http://user:pass@localhost:3001' }],
  ['null origin', { origin: 'null' }],
] as const) test(`origin admission rejects ${label}`, async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  assert.equal((await handler(request('example.com', { headers }))).status, 403);
  assert.equal(calls, 0);
});

for (const [label, options] of [
  ['cross origin', { origin: 'https://other.example.com' }],
  ['cross-site fetch', { headers: { 'sec-fetch-site': 'cross-site' } }],
  ['query', { query: '?hostname=example.com' }],
  ['form encoding', { headers: { 'content-type': 'application/x-www-form-urlencoded' } }],
  ['compressed encoding', { headers: { 'content-encoding': 'gzip' } }],
  ['extra URL field', { body: JSON.stringify({ hostname: 'example.com', url: 'http://127.0.0.1' }) }],
  ['extra header field', { body: JSON.stringify({ hostname: 'example.com', headers: { Authorization: 'secret' } }) }],
  ['duplicate field', { body: '{"hostname":"example.com","hostname":"other.example.com"}' }],
  ['wrong field', { body: '{"target":"example.com"}' }],
  ['non-string target', { body: '{"hostname":123}' }],
  ['array', { body: '[]' }],
  ['invalid JSON', { body: '{' }],
  ['invalid hostname', { body: '{"hostname":"http://127.0.0.1"}' }],
] as const) test(`request rejects ${label} before collection`, async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  const response = await handler(request('example.com', options));
  assert.ok(response.status === 400 || response.status === 403);
  assert.equal(calls, 0);
});

test('request rejects bodies above 1 KiB before collection', async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  const response = await handler(request('example.com', { body: 'x'.repeat(1025) }));
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('body deadline cancels source without awaiting an uncooperative cancel hook', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull() { return new Promise(() => {}); },
    cancel() { cancelled = true; return new Promise(() => {}); },
  });
  const req = new Request('http://localhost:3001/api/external-exposure', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  const started = Date.now();
  await assert.rejects(readExternalRequestBody(req, 20), /did not complete/);
  assert.ok(cancelled);
  assert.ok(Date.now() - started < 1000);
});

test('oversized body cancels without awaiting an uncooperative cancel hook', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(1025)); },
    cancel() { cancelled = true; return new Promise(() => {}); },
  });
  const req = new Request('http://localhost:3001/api/external-exposure', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(readExternalRequestBody(req, 1000), /exceeds/);
  assert.ok(cancelled);
});

test('host cooldown uses normalized hostname and cannot be reset with forwarded headers', async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  assert.equal((await handler(request('EXAMPLE.COM'))).status, 200);
  const retry = await handler(request('example.com', { headers: { 'x-forwarded-for': '203.0.113.92', 'x-real-ip': '203.0.113.93' } }));
  assert.equal(retry.status, 429);
  assert.ok(Number(retry.headers.get('retry-after')) > 0);
  assert.equal(calls, 1);
});

test('overall ten-per-minute limit uses one global key across hostname and header changes', async () => {
  let calls = 0;
  const handler = createExternalExposureHandler(async hostname => { calls++; return success(hostname); }, { namespace: namespace() });
  for (let index = 0; index < 10; index++) assert.equal((await handler(request(`host${index}.example.com`, { headers: { 'x-forwarded-for': `203.0.113.${index}` } }))).status, 200);
  assert.equal((await handler(request('another.example.com'))).status, 429);
  assert.equal(calls, 10);
});

test('two slots cover pending body reads and are released after deadline', async () => {
  const handler = createExternalExposureHandler(success, { namespace: namespace(), bodyDeadlineMs: 40 });
  const slow = () => new Request('http://localhost:3001/api/external-exposure', {
    method: 'POST', headers: { host: 'localhost:3001', origin: 'http://localhost:3001', 'content-type': 'application/json' },
    body: new ReadableStream({ pull() { return new Promise(() => {}); } }), duplex: 'half',
  } as RequestInit);
  const first = handler(slow()), second = handler(slow());
  assert.equal((await handler(request())).status, 429);
  assert.equal((await first).status, 408);
  assert.equal((await second).status, 408);
  assert.equal((await handler(request())).status, 200);
});

test('slots span running collection and release after adapter rejects a malformed result', async () => {
  const releases: (() => void)[] = [];
  const handler = createExternalExposureHandler(async hostname => {
    await new Promise<void>(resolve => { releases.push(resolve); });
    const fixture = snapshotFixture(hostname);
    fixture.checks.pop();
    return fixture;
  }, { namespace: namespace() });
  const first = handler(request('one.example.com')), second = handler(request('two.example.com'));
  while (releases.length < 2) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await handler(request('three.example.com'))).status, 429);
  releases.forEach(release => release());
  assert.equal((await first).status, 422);
  assert.equal((await second).status, 422);
  const after = createExternalExposureHandler(success, { namespace: namespace() });
  assert.equal((await after(request())).status, 200);
});

test('runner errors expose no diagnostic details and free the slot', async () => {
  const handler = createExternalExposureHandler(async () => { throw new Error('internal secret path'); }, { namespace: namespace() });
  const response = await handler(request());
  assert.equal(response.status, 422);
  assert.doesNotMatch(await response.text(), /secret|internal/);
  const after = createExternalExposureHandler(success, { namespace: namespace() });
  assert.equal((await after(request())).status, 200);
});

test('a valid snapshot for another hostname cannot satisfy this request', async () => {
  const handler = createExternalExposureHandler(async () => snapshotFixture('other.example.com'), { namespace: namespace() });
  const response = await handler(request('example.com'));
  assert.equal(response.status, 422);
  assert.doesNotMatch(await response.text(), /other\.example\.com|"model"/);
});

test('acquisition page is canonical while the bounded request route stays unchanged', () => {
  const page = readFileSync(new URL('../../app/check/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /alternates: \{ canonical: '\/check' \}/);
  const route = readFileSync(new URL('../../app/api/external-exposure/route.ts', import.meta.url), 'utf8');
  assert.match(route, /runtime = 'nodejs'/);
  assert.match(route, /createExternalExposureHandler\(runSnapshot\)/);
  const sitemap = readFileSync(new URL('../../app/sitemap.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(sitemap, /route: ["']\/check["']/);
});
