import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { matrixWidgetCsp, matrixWidgetHtml, matrixWidgetOrigins } from '../src/matrix-widget-view.mjs';

const original = readFileSync(new URL('../src/decision-room.html', import.meta.url), 'utf8');
const inline = original.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const css = original.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const checksum = x => 'sha256-' + createHash('sha256').update(x).digest('base64');

test('Matrix mode is default-off and requires exact HTTPS origins outside loopback', () => {
  assert.deepEqual(matrixWidgetOrigins(''), []);
  assert.throws(() => matrixWidgetCsp([]), /disabled/);
  assert.deepEqual(matrixWidgetOrigins('https://element.witnessops.com,https://element.witnessops.com/'), ['https://element.witnessops.com']);
  for (const origin of ['*', 'http://element.witnessops.com', 'https://example.net/path',
    'https://element.witnessops.com?x=1', 'https://example.net/#x',
    'https://user@host.example', 'ftp://host.example']) {
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
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, 2);
  assert.equal(scripts[1], inline);
  const csp = matrixWidgetCsp(['https://element.witnessops.com']);
  assert.ok(csp.includes("'" + checksum(scripts[0]) + "'"));
  assert.ok(csp.includes("'" + checksum(scripts[1]) + "'"));
  assert.ok(csp.includes('frame-ancestors https://element.witnessops.com'));
  assert.ok(csp.includes("connect-src 'self'"));
  assert.ok(!csp.includes("script-src 'unsafe-inline'"));
  assert.doesNotThrow(() => new Function(scripts[0]));
  assert.doesNotThrow(() => new Function(scripts[1]));
});
