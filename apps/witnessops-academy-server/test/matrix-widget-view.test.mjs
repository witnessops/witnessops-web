import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { DECISION_ROOM_SCRIPT, matrixWidgetCsp, matrixWidgetHtml, matrixWidgetOrigins, matrixWidgetResponse } from '../src/matrix-widget-view.mjs';

const original = readFileSync(new URL('../src/decision-room.html', import.meta.url), 'utf8');
const CLOSE = '</' + 'script>';
// Position-based extraction of every inline script body (no HTML-matching regex).
const scriptBodies = text => text.split('<script>').slice(1).map(part => part.slice(0, part.indexOf(CLOSE)));
const inline = scriptBodies(original)[0];
const css = original.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const checksum = x => 'sha256-' + createHash('sha256').update(x).digest('base64');

test('Matrix mode is default-off and requires exact HTTPS origins outside loopback', () => {
  assert.deepEqual(matrixWidgetOrigins(''), []);
  assert.throws(() => matrixWidgetCsp([]), /disabled/);
  assert.deepEqual(matrixWidgetOrigins('https://element.witnessops.com,https://element.witnessops.com/'), ['https://element.witnessops.com']);
  for (const origin of ['*', 'http://element.witnessops.com', 'https://example.net/path',
    'https://element.witnessops.com?x=1', 'https://example.net/#x',
    'https://user@host.example', 'ftp://host.example', 'https://element.witnessops.com.', 'https://element.witnessops.com./']) {
    assert.throws(() => matrixWidgetOrigins(origin), undefined, origin);
  }
  assert.deepEqual(matrixWidgetOrigins('http://localhost:4821'), ['http://localhost:4821']);
});

test('Matrix adapter retains the exact MCP Apps visual markup and CSS', () => {
  const html = matrixWidgetHtml('fake-test-csrf');
  assert.equal(html.match(/<style>/g).length, 1);
  assert.equal(html.match(/<script>/g).length, 2);
  assert.ok(html.includes('<style>' + css + '</style>'));
  assert.ok(html.includes('Evidence desk'));
  assert.ok(html.includes('Save decision'));
  assert.ok(html.includes('FICTIONAL EXERCISE'));
  assert.match(html, /AcademyMatrixTransport/);
});

test('scoped CSP hashes each exact script, restricts frame ancestors, and escapes session data', () => {
  const html = matrixWidgetHtml('</script><script>alert(1)</script>');
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
  const scripts = scriptBodies(html);
  assert.equal(scripts.length, 2);
  assert.equal(scripts[1], inline);
  assert.equal(DECISION_ROOM_SCRIPT, inline);
  const csp = matrixWidgetCsp(['https://element.witnessops.com']);
  assert.ok(csp.includes("'" + checksum(scripts[0]) + "'"));
  assert.ok(csp.includes("'" + checksum(scripts[1]) + "'"));
  assert.ok(csp.includes('frame-ancestors https://element.witnessops.com'));
  assert.ok(csp.includes("connect-src 'self'"));
  assert.ok(!csp.includes("script-src 'unsafe-inline'"));
  assert.doesNotThrow(() => new Function(scripts[0]));
  assert.doesNotThrow(() => new Function(scripts[1]));
});

test('replacement patterns in the CSRF token are inserted literally (L-1)', () => {
  for (const token of ["$&", "$'", '$`', '$1', '$$']) {
    const html = matrixWidgetHtml(`tok-${token}-end`);
    assert.ok(html.includes(JSON.stringify(`tok-${token}-end`)), token);
    assert.equal(html.split('<script>').length, 3, token);
  }
});

const LESSON_1 = { id: 'report-or-evidence' }, LESSON_2 = { id: 'same-scope' };
const ORIGINS = ['https://element.witnessops.com'];
const SESSION = { identity_id: '00000000-0000-4000-8000-000000000001', csrf_token: 'fake-test-csrf' };
const route = (over = {}) => {
  const calls = { session: 0, grant: 0 };
  const promise = matrixWidgetResponse({
    lesson: LESSON_1, origins: ORIGINS, method: 'GET', requiresGrant: true,
    getSession: async () => { calls.session += 1; return SESSION; },
    hasGrant: async () => { calls.grant += 1; return true; },
    ...over,
  });
  return promise.then(result => ({ result, calls }));
};

test('widget route is 404 when the feature is off or for another lesson, before any session read (L-2)', async () => {
  for (const over of [{ origins: [] }, { lesson: LESSON_2 }, { lesson: undefined }]) {
    const { result, calls } = await route(over);
    assert.deepEqual(result, { status: 404, json: { error: 'not_found' } });
    assert.equal(calls.session, 0);
  }
});

test('widget route is 403 without a session or without a grant (L-2)', async () => {
  assert.deepEqual((await route({ getSession: async () => null })).result, { status: 403, json: { error: 'access_required' } });
  assert.deepEqual((await route({ hasGrant: async () => false })).result, { status: 403, json: { error: 'access_required' } });
  const sessionOnly = await route({ requiresGrant: false, hasGrant: async () => { throw new Error('grant must not be consulted'); } });
  assert.equal(sessionOnly.result.status, 200);
});

test('widget denials carry no framing override; success is no-store with scoped frame-ancestors (L-2)', async () => {
  const denied = (await route({ getSession: async () => null })).result;
  assert.equal(denied.headers, undefined, 'denials go through the default DENY-framed send()');
  const { result } = await route();
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['X-Frame-Options'], undefined);
  assert.match(result.headers['Content-Security-Policy'], /frame-ancestors https:\/\/element\.witnessops\.com$/);
  assert.equal(result.headers['Strict-Transport-Security'], undefined);
  assert.ok(result.body.includes('academy-csrf'));
  assert.equal((await route({ secure: true })).result.headers['Strict-Transport-Security'], 'max-age=31536000');
});

test('HEAD on the widget returns headers and no body (L-2)', async () => {
  const { result } = await route({ method: 'HEAD' });
  assert.equal(result.status, 200);
  assert.equal(result.body, undefined);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});

test('the normal lesson page keeps X-Frame-Options DENY and frame-ancestors none (L-2)', () => {
  const server = readFileSync(new URL('../src/server.mjs', import.meta.url), 'utf8');
  const sendFn = server.slice(server.indexOf('function send(res, status, body'), server.indexOf('async function revoke('));
  assert.ok(sendFn.includes("'X-Frame-Options': 'DENY'"));
  assert.ok(sendFn.includes("'Content-Security-Policy': CSP"));
  assert.match(server, /const CSP = `[^`]*frame-ancestors 'none'/);
  // The only path that bypasses send() is the explicit matrix widget branch.
  assert.equal(server.split('res.writeHead(widget.status, widget.headers)').length, 2);
  const lessonBranch = server.slice(server.indexOf("if (url.searchParams.get('format') === 'matrix')"));
  assert.match(lessonBranch, /return send\(res, 200, url\.searchParams\.get\('format'\) === 'worksheet'/);
});
