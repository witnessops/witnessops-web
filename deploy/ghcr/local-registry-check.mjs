// Explicit loopback integration command; never contacts GHCR or executes an image.
// REGCTL and REGISTRY_BINARY must be installed tools (regctl v0.11.6 and
// go-containerregistry registry v0.20.6 were used for local validation).
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture } from './fixture.mjs';
import { publish } from './publish.mjs';

assert.ok(process.env.REGCTL && process.env.REGISTRY_BINARY, 'both tools required; no skipped success');
const f = fixture();
const server = spawn(process.env.REGISTRY_BINARY, ['-port', '0'], { stdio: ['ignore', 'ignore', 'pipe'] });
try {
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('loopback registry startup timeout')), 10000);
    server.on('error', reject);
    server.on('exit', () => reject(new Error('registry exited before ready')));
    server.stderr.on('data', bytes => {
      output += bytes;
      const match = output.match(/serving on port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  const registry = `localhost:${port}`;
  const calls = [];
  const transport = args => {
    calls.push(args);
    // Fixture-only mapping leaves production orchestration and readback intact.
    const mapped = args.map(arg => arg.replace('ghcr.io/example/fixture', `${registry}/example/fixture`));
    return execFileSync(process.env.REGCTL, ['--host', `reg=${registry},tls=disabled`, ...mapped],
      { maxBuffer: 64 * 1024 * 1024 });
  };
  const stage = publish('stage', f.dir, f.env, transport);
  const promoted = publish('promote', f.dir, f.env, transport);
  assert.equal(stage.status, 'verified'); assert.equal(promoted.status, 'verified');
  // A real registry response substituted at the transport boundary must prevent promotion.
  const bad = args => args[0] === 'manifest' ? Buffer.from('{}') : transport(args);
  const writes = calls.filter(a => a[1] === 'copy').length;
  assert.throws(() => publish('promote', f.dir, f.env, bad), /registry manifest mismatch/);
  assert.equal(calls.filter(a => a[1] === 'copy').length, writes);
  const result = {
    scope: 'synthetic OCI fixture, loopback registry only; no app execution or live GHCR',
    manifest_digest: stage.manifest_digest, config_digest: stage.config_digest,
    archive_sha256: f.env.EXPECTED_IMAGE_ARCHIVE_SHA256,
    candidate_readback: stage.status, consumer_tag_readback: promoted.status,
    mismatch_blocks_promotion: true,
  };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.EVIDENCE_DIR) {
    writeFileSync(join(process.env.EVIDENCE_DIR, 'local-registry.json'), JSON.stringify(result, null, 2) + '\n');
    writeFileSync(join(process.env.EVIDENCE_DIR, 'sample-binding.json'), readFileSync(join(f.dir, 'binding.json')));
    writeFileSync(join(process.env.EVIDENCE_DIR, 'sample-failure.json'), readFileSync(join(f.dir, 'registry-promote.json')));
  }
} finally {
  server.kill();
  await once(server, 'exit');
  rmSync(f.dir, { recursive: true, force: true });
}
