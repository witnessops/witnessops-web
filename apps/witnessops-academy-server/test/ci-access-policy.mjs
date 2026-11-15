// Persist only the disposable CI admission profile; never edit live configuration.
import { randomUUID } from 'node:crypto';
import { lstat, readFile, realpath, rename, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function persistCiAccessPolicy(policy, env = process.env) {
  if (!['session-only', 'approved-free-pilot'].includes(policy)
    || env.ACADEMY_E2E !== '1' || env.ACADEMY_INVITATIONS_DISPOSABLE !== '1'
    || !['127.0.0.1', 'localhost', '::1'].includes(env.ACADEMY_DB_HOST)) {
    throw new Error('Explicit disposable loopback CI profile required');
  }
  for (const key of ['ACADEMY_PUBLIC_ORIGIN', 'ACADEMY_TEST_APP_URL']) {
    const address = env[key];
    if (!address || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(address).hostname)) {
      throw new Error('Disposable application URL must be loopback');
    }
  }
  const filename = env.ACADEMY_CI_ENV;
  if (!filename) throw new Error('ACADEMY_CI_ENV is required');
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid()
    || (info.mode & 0o077) !== 0 || info.size > 65536 || await realpath(filename) !== path.resolve(filename)) {
    throw new Error('Private owned CI environment file required');
  }
  const original = await readFile(filename, 'utf8');
  const lines = original.split('\n');
  const matching = lines.filter(line => /^ACADEMY_ACCESS_POLICY=/.test(line));
  if (matching.length !== 1) throw new Error('Exactly one persisted fixture policy is required');
  const updated = lines.map(line => /^ACADEMY_ACCESS_POLICY=/.test(line)
    ? 'ACADEMY_ACCESS_POLICY=' + policy : line).join('\n');
  const temporary = path.join(path.dirname(filename), '.academy-policy-' + randomUUID());
  let created = false;
  try {
    const file = await open(temporary, 'wx', 0o600);
    created = true;
    try { await file.writeFile(updated); await file.sync(); } finally { await file.close(); }
    if (await readFile(filename, 'utf8') !== original) throw new Error('CI environment changed concurrently');
    await rename(temporary, filename);
    created = false;
  } finally {
    if (created) await unlink(temporary);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await persistCiAccessPolicy(process.argv[2]);
  console.log('CI fixture access policy persisted: ' + process.argv[2]);
}

