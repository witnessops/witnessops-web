import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { request } from 'node:http';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAcademyServer } from '../scripts/serve.mjs';

let server;
let port;
before(async () => {
  server = await createAcademyServer(new URL('../public/', import.meta.url));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

const get = (path, method = 'GET', targetPort = port) => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port: targetPort, path, method }, response => {
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
  const second = await get('/lessons/same-scope/');
  assert.equal(second.status, 200);
  assert.match(second.body, /Same record, wrong scope/);
  assert.match(second.headers['content-security-policy'], /connect-src 'none'/);
  assert.match(home.body, /Two lessons exist so far\. Both are pilot drafts, taught by Docs\./);
  assert.match(home.body, /Lessons 1 and 2/);
  assert.match(home.body, /Work with AI[\s\S]*?Not written yet/);
  assert.match(home.body, /Build agents[\s\S]*?Not written yet/);
  assert.match(home.body, /Operate safely[\s\S]*?Not written yet/);
});

test('HEAD preserves headers without sending the page body', async () => {
  const result = await get('/', 'HEAD');
  assert.equal(result.status, 200);
  assert.equal(result.body, '');
  assert.ok(Number(result.headers['content-length']) > 0);
});

test('does not expose private teaching files, dotfiles or traversal paths', async () => {
  for (const path of ['/docs/ANSWER-KEY.md', '/package.json', '/.git/config', '/../package.json', '/%2e%2e/package.json', '/%2e%2e%2fpackage.json', '/%252e%252e/package.json', '/%5c..%5cpackage.json', '/%00index.html', '/missing']) {
    assert.equal((await get(path)).status, 404, path);
  }
  assert.equal((await get('/%ZZ')).status, 400);
});

test('does not accept submitted answers or other writes', async () => {
  assert.equal((await get('/', 'POST')).status, 405);
});

test('preloads directory index aliases and keeps query strings out of route lookup', async () => {
  const home = await get('/');
  assert.equal((await get('/index.html')).body, home.body);
  const lesson = await get('/lessons/report-or-evidence/');
  for (const path of ['/lessons/report-or-evidence', '/lessons/report-or-evidence/index.html', '/lessons/report-or-evidence/?from=home']) {
    const result = await get(path);
    assert.equal(result.status, 200, path);
    assert.equal(result.body, lesson.body, path);
  }
  const second = await get('/lessons/same-scope/');
  for (const path of ['/lessons/same-scope', '/lessons/same-scope/index.html', '/lessons/same-scope/?from=lesson-1']) {
    const result = await get(path);
    assert.equal(result.status, 200, path);
    assert.equal(result.body, second.body, path);
  }
});

async function fixtureServer(t, prepare) {
  const directory = await mkdtemp(join(tmpdir(), 'academy-server-'));
  const publicRoot = join(directory, 'public');
  let fixture;
  t.after(async () => {
    if (fixture) await new Promise((resolve, reject) => fixture.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(publicRoot);
  await prepare(publicRoot, directory);
  fixture = await createAcademyServer(pathToFileURL(publicRoot + '/'));
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  return { publicRoot, get: (path, method) => get(path, method, fixture.address().port) };
}

test('ignores symlink files/directories, dotfiles and unsupported file types during preloading', async t => {
  const fixture = await fixtureServer(t, async (publicRoot, directory) => {
    await writeFile(join(publicRoot, 'index.html'), 'public home');
    await writeFile(join(publicRoot, '.hidden.html'), 'hidden content');
    await writeFile(join(publicRoot, 'notes.md'), 'unserved notes');
    await mkdir(join(publicRoot, '.hidden'));
    await writeFile(join(publicRoot, '.hidden/index.html'), 'hidden directory');
    await writeFile(join(directory, 'private.html'), 'private content');
    await mkdir(join(directory, 'private-directory'));
    await writeFile(join(directory, 'private-directory/index.html'), 'private directory');
    await symlink(join(directory, 'private.html'), join(publicRoot, 'leak.html'));
    await symlink(join(directory, 'private-directory'), join(publicRoot, 'linked-directory'));
    await symlink(join(publicRoot, 'index.html'), join(publicRoot, 'linked-home.html'));
  });
  assert.equal((await fixture.get('/')).body, 'public home');
  for (const path of ['/leak.html', '/linked-directory/', '/linked-directory/index.html', '/linked-home.html', '/.hidden.html', '/.hidden/', '/notes.md']) {
    assert.equal((await fixture.get(path)).status, 404, path);
  }
});

test('requests use the startup snapshot even when files change or disappear later', async t => {
  const fixture = await fixtureServer(t, async publicRoot => {
    await writeFile(join(publicRoot, 'index.html'), 'snapshot home');
    await writeFile(join(publicRoot, 'app.mjs'), 'export const example = true;');
  });
  await writeFile(join(fixture.publicRoot, 'index.html'), 'changed home');
  await writeFile(join(fixture.publicRoot, 'later.html'), 'later content');
  await rm(join(fixture.publicRoot, 'app.mjs'));
  assert.equal((await fixture.get('/')).body, 'snapshot home');
  assert.equal((await fixture.get('/later.html')).status, 404);
  const script = await fixture.get('/app.mjs');
  assert.equal(script.status, 200);
  assert.equal(script.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(script.body, 'export const example = true;');
});
