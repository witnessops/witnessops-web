import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { request } from 'node:http';
import { createAcademyServer } from '../scripts/serve.mjs';

let server;
let port;
before(async () => {
  server = createAcademyServer(new URL('../public/', import.meta.url));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

const get = (path, method = 'GET') => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port, path, method }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
  });
  req.on('error', reject);
  req.end();
});

test('serves home and the nested lesson with a script policy that prevents network submission', async () => {
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(home.body, /WitnessOps Academy/);
  assert.match(home.headers['content-security-policy'], /connect-src 'none'/);
  const lesson = await get('/lessons/report-or-evidence/');
  assert.equal(lesson.status, 200);
  assert.match(lesson.body, /Report or evidence/);
});

test('HEAD preserves headers without sending the page body', async () => {
  const result = await get('/', 'HEAD');
  assert.equal(result.status, 200);
  assert.equal(result.body, '');
  assert.ok(Number(result.headers['content-length']) > 0);
});

test('does not expose private teaching files, dotfiles or traversal paths', async () => {
  for (const path of ['/docs/ANSWER-KEY.md', '/package.json', '/.git/config', '/../package.json', '/%2e%2e/package.json', '/%5c..%5cpackage.json', '/missing']) {
    assert.equal((await get(path)).status, 404, path);
  }
  assert.equal((await get('/%ZZ')).status, 400);
});

test('does not accept submitted answers or other writes', async () => {
  assert.equal((await get('/', 'POST')).status, 405);
});
