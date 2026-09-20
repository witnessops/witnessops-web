import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCliArtifact } from '../../../scripts/build-cli-artifact.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('versioned archive installs and runs without a repository checkout', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'witnessops-cli-distribution-'));
  try {
    const output = path.join(scratch, 'artifact');
    const built = await buildCliArtifact(['--output', output]);
    assert.equal(built.version, '0.0.1');
    assert.match(built.sha256, /^[a-f0-9]{64}$/);
    assert.equal(await readFile(`${built.destination}.sha256`, 'utf8'), `${built.sha256}  ${path.basename(built.destination)}\n`);

    const listing = spawnSync('tar', ['-tzf', built.destination], { encoding: 'utf8' });
    assert.equal(listing.status, 0, listing.stderr);
    assert.match(listing.stdout, /package\/README\.md/);
    assert.doesNotMatch(listing.stdout, /\.test\.mjs/);

    const prefix = path.join(scratch, 'installed');
    const install = spawnSync('npm', ['install', '--global', '--prefix', prefix, built.destination], {
      encoding: 'utf8',
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    });
    assert.equal(install.status, 0, install.stderr);
    const status = spawnSync(path.join(prefix, 'bin/wops'), ['auth', 'status'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: path.join(scratch, 'home'),
        XDG_CONFIG_HOME: path.join(scratch, 'config'),
      },
    });
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout.trim(), 'Not signed in.');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('artifact builder rejects ambiguous arguments', async () => {
  await assert.rejects(buildCliArtifact(['--output']), /Use node scripts/);
});
