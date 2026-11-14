import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readSessionTokenKeyring } from '../src/token-keyring-file.mjs';

// Deterministic synthetic bytes for parser/custody tests; never operational keys.
const fixture = JSON.stringify({ active: 'synthetic', keys: { synthetic: Buffer.alloc(32, 7).toString('base64') } });
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-custody-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'academy_token_keyring');
  fs.writeFileSync(file, fixture, { mode: 0o600 });
  return { root, file };
}
test('reads only a selected private regular file, including the credential-directory route', t => {
  const { root, file } = setup(t);
  assert.equal(readSessionTokenKeyring({ file }), fixture);
  fs.chmodSync(file, 0o400);
  assert.equal(readSessionTokenKeyring({ file: '', credentialsDirectory: root }), fixture);
});
test('rejects group/other access, executable files, relative paths, links and empty/large files', t => {
  const { root, file } = setup(t);
  for (const mode of [0o640, 0o644, 0o660, 0o700]) {
    fs.chmodSync(file, mode);
    assert.throws(() => readSessionTokenKeyring({ file }), /custody check failed/);
  }
  fs.chmodSync(file, 0o600);
  const link = path.join(root, 'link');
  fs.symlinkSync(file, link);
  for (const p of [link, root, 'relative-keyring']) assert.throws(() => readSessionTokenKeyring({ file: p }), /custody check failed/);
  for (const text of ['', 'x'.repeat(16385)]) {
    fs.writeFileSync(file, text);
    assert.throws(() => readSessionTokenKeyring({ file }), /custody check failed/);
  }
});
test('read-only preflight reports no file path or secret and creates no files', t => {
  const { root, file } = setup(t);
  const script = fileURLToPath(new URL('../scripts/check-token-keyring.mjs', import.meta.url));
  const env = { ...process.env, ACADEMY_TOKEN_KEYRING_FILE: file };
  const before = fs.readdirSync(root);
  const good = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
  assert.equal(good.status, 0);
  assert.deepEqual(JSON.parse(good.stdout), { ok: true, check: 'token_keyring_custody_and_format', network: false });
  assert.equal(good.stdout.includes(file) || good.stdout.includes(fixture), false);
  assert.deepEqual(fs.readdirSync(root), before);
  fs.chmodSync(file, 0o644);
  const bad = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr.includes(file) || bad.stderr.includes(fixture), false);
  const fifo = path.join(root, 'fifo');
  assert.equal(spawnSync('mkfifo', ['-m', '600', fifo]).status, 0);
  const pipe = spawnSync(process.execPath, [script], { env: { ...env, ACADEMY_TOKEN_KEYRING_FILE: fifo }, timeout: 1500, encoding: 'utf8' });
  assert.equal(pipe.status, 1);
  fs.chmodSync(file, 0o600);
  fs.writeFileSync(file, '{}');
  assert.equal(spawnSync(process.execPath, [script], { env, encoding: 'utf8' }).status, 1);
});
