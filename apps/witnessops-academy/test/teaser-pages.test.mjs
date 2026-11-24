import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { after, before, test } from 'node:test';
import { createAcademyServer } from '../scripts/serve.mjs';

const TRACKS = [
  ['/tracks/work-with-ai/', 'I · Work with AI', 'coming soon'],
  ['/tracks/build-agents/', 'II · Build agents', 'coming soon'],
  ['/tracks/operate-safely/', 'III · Operate safely', 'coming soon'],
  ['/tracks/verify-results/', 'IV · Verify results', 'pilot open'],
];
const PAGES = ['/tracks/', ...TRACKS.map(([path]) => path)];

let server;
let port;
before(async () => {
  server = await createAcademyServer(new URL('../public/', import.meta.url));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

const get = path => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port, path }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
  });
  req.on('error', reject);
  req.end();
});

test('teaser index lists the four tracks and links each track page', async () => {
  const index = await get('/tracks/');
  assert.equal(index.status, 200);
  assert.match(index.headers['content-security-policy'], /connect-src 'none'/);
  for (const [path, title, status] of TRACKS) {
    assert.ok(index.body.includes(`href="${path}"`), path);
    assert.ok(index.body.includes(`<h3>${title}</h3>`), title);
    assert.ok(index.body.includes(status), status);
  }
  assert.match(index.body, /Two pilot lessons with a teacher are live/);
  assert.match(index.body, /<em>Same record, wrong scope\?<\/em> You sort/);
});

test('track pages render with prev/next navigation and Track IV links the unchanged pilot lessons', async () => {
  for (const [i, [path, title]] of TRACKS.entries()) {
    const page = await get(path);
    assert.equal(page.status, 200, path);
    assert.ok(page.body.includes(`<h1>${title}</h1>`), title);
    assert.ok(page.body.includes(`href="${path}" aria-current="page"`), path);
    if (i < TRACKS.length - 1) assert.ok(page.body.includes(`href="${TRACKS[i + 1][0]}" rel="next"`), path);
    assert.equal((await get(path.slice(0, -1))).body, page.body);
  }
  const iv = (await get('/tracks/verify-results/')).body;
  assert.ok(iv.includes('href="/lessons/report-or-evidence/"'));
  assert.ok(iv.includes('href="/lessons/same-scope/"'));
  assert.match(iv, /With a teacher: each lesson explains/);
});

test('teaser pages carry no review markers, prices, emails, external links or Crew/teacher names', async () => {
  for (const path of PAGES) {
    const { body } = await get(path);
    assert.doesNotMatch(body, /PROPOSED|DRAFT|\bCrew\b|\bDocs\b/, path);
    assert.doesNotMatch(body, /mailto:|@[a-z0-9-]+\.[a-z]/i, path);
    assert.doesNotMatch(body, /[€$£]\s*\d|\b(?:EUR|PLN|USD|GBP)\s*\d/i, path);
    assert.doesNotMatch(body, /(?:href|src)="(?:https?:|\/\/)/i, path);
    assert.doesNotMatch(body, /wrong scope\?<\/(?:em|strong)>\./, path);
    for (const match of body.matchAll(/\ssrc="(\/tracks\/assets\/[^"]+)"/g)) {
      const asset = await get(match[1]);
      assert.equal(asset.status, 200, match[1]);
      assert.equal(asset.headers['content-type'], 'image/png', match[1]);
    }
  }
});

test('teaser stylesheet uses the charcoal, ivory and brass palette with Libre Caslon and no orange', async () => {
  const css = await readFile(new URL('../public/tracks/teaser.css', import.meta.url), 'utf8');
  for (const token of ['--ch:#0b0c0b', '--iv:#f5f1e8', '--br:#b89b62', 'Libre Caslon Text']) assert.ok(css.includes(token), token);
  assert.doesNotMatch(css, /orange|#ff[0-9a-f]{4}\b|#f[0-9a-f]9[0-9a-f]{3}\b/i);
  assert.equal((await get('/fonts/libre-caslon-text-700.woff2')).status, 200);
});
