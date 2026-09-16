import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha, inspect, evidence } from './evidence.mjs';

export function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ghcr-acceptance-'));
  execFileSync('python3', [fileURLToPath(new URL('./fixture.py', import.meta.url)), dir]);
  const identity = inspect(join(dir, 'witnessops-web-image.tar'));
  const env = {
    SOURCE_COMMIT: 'a'.repeat(40), BUILD_SOURCE_COMMIT: 'a'.repeat(40), GATE_SOURCE_COMMIT: 'a'.repeat(40),
    GITHUB_WORKFLOW_SHA: 'b'.repeat(40), GITHUB_REPOSITORY: 'example/fixture',
    GITHUB_WORKFLOW_REF: 'example/fixture/.github/workflows/build-image.yml@refs/heads/main',
    GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', BUILD_RUN_ID: '123', BUILD_RUN_ATTEMPT: '1',
    EXPECTED_IMAGE_ARCHIVE_SHA256: sha(readFileSync(join(dir, 'witnessops-web-image.tar'))),
    EXPECTED_MANIFEST_DIGEST: identity.image_digest, EXPECTED_CONFIG_DIGEST: identity.config_digest,
    VERIFIER_RESULT: 'success', IMAGE_REPOSITORY: 'ghcr.io/example/fixture', RECEIPT_DIR: dir,
    CONSUMER_TAGS: '["stable"]',
  };
  const report = {
    SchemaVersion: 2, ArtifactType: 'container_image', Trivy: { Version: '0.74.0' },
    CreatedAt: '2026-09-17T00:00:00Z',
    Metadata: { ImageID: identity.config_digest, ImageConfig: { os: 'linux', architecture: 'amd64' } },
    Results: [{ Class: 'os-pkgs', Type: 'alpine' }, { Class: 'lang-pkgs', Type: 'node-pkg' }],
  };
  function reportWrite() { writeFileSync(join(dir, 'trivy.json'), JSON.stringify(report)); }
  function bind() {
    const bytes = JSON.stringify(evidence(dir, env), null, 2) + '\n';
    writeFileSync(join(dir, 'binding.json'), bytes);
    env.EXPECTED_BINDING_SHA256 = sha(bytes);
    env.EXPECTED_REPORT_SHA256 = sha(readFileSync(join(dir, 'trivy.json')));
  }
  reportWrite(); bind();
  const calls = [];
  function registry(args) {
    calls.push(args);
    if (args[0] === 'manifest') return readFileSync(join(dir, 'manifest.raw'));
    if (args[0] === 'blob') return readFileSync(join(dir, 'config.raw'));
    if (args[1] === 'digest') return Buffer.from(identity.image_digest + '\n');
    return Buffer.alloc(0);
  }
  return { dir, env, report, reportWrite, bind, registry, calls };
}
