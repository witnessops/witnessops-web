import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const job = (text, id) => text.split(`\n  ${id}:\n`)[1]?.split(/\n  [a-z_]+:\n/)[0];
for (const name of ['build-image', 'release']) test(`${name}: independent gate and ordered exact-image publication`, () => {
  const workflow = read(`.github/workflows/${name}.yml`);
  const build = job(workflow, 'build'), verify = job(workflow, 'verify_artifact'), publish = job(workflow, 'publish');
  assert.ok(build && verify && publish);
  assert.match(build, /--platform linux\/amd64 --provenance=false --sbom=false/);
  assert.match(build, /type=oci,dest=/);
  assert.equal((build.match(/docker buildx build/g) ?? []).length, 1);
  assert.match(build, /pnpm --filter witnessops-web build/); // Standalone build retained.
  assert.match(build, /git rev-parse HEAD/);
  assert.match(build, /GATE_SOURCE_COMMIT/);
  assert.match(verify, /permissions:\n      contents: read\n/);
  assert.doesNotMatch(verify, /packages: write|id-token: write|secrets\.|environment:/);
  for (const section of [verify, publish]) {
    assert.match(section, /ref: \$\{\{ github.workflow_sha \}\}/);
    assert.match(section, /persist-credentials: false/);
    assert.match(section, /BUILD_RUN_ID:/);
    assert.match(section, /BUILD_RUN_ATTEMPT:/);
    assert.doesNotMatch(section, /continue-on-error|^\s+(?:run: )?(?:docker (?:run|build|load)|pnpm (?:install|build)|npm (?:ci|install))/m);
  }
  assert.match(verify, /node deploy\/ghcr\/scan.mjs/);
  assert.match(verify, /node deploy\/ghcr\/evidence.mjs bind/);
  const handoff = verify.slice(verify.indexOf('      - name: Transfer only successfully accepted'));
  assert.doesNotMatch(handoff, /if: always\(\)|continue-on-error/);
  for (const file of ['witnessops-web-image.tar', 'trivy.json', 'binding.json']) assert.ok(handoff.includes(file));
  assert.match(verify, /if: always\(\)/); // Failure diagnostics, separate artifact.
  assert.match(publish, /needs: \[[^\]]*verify_artifact[^\]]*\]/);
  assert.doesNotMatch(publish.split('    steps:')[0], /always\(\)/);
  assert.match(publish, /VERIFIER_RESULT: \$\{\{ needs.verify_artifact.result \}\}/);
  for (const key of ['manifest_digest', 'config_digest', 'report_sha256', 'binding_sha256']) {
    assert.ok(publish.includes(`needs.verify_artifact.outputs.${key}`));
  }
  const positions = [
    'node deploy/ghcr/evidence.mjs verify',
    'node deploy/ghcr/publish.mjs stage',
    'cosign sign --yes',
    'cosign verify',
    'node deploy/ghcr/publish.mjs promote',
  ].map(s => publish.indexOf(s));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(publish, /cosign attach sbom/);
  assert.match(publish, /registry-\*.json/);
  assert.doesNotMatch(publish, /docker push|docker tag|aws |deploy-production/);
  if (name === 'release') {
    assert.match(workflow, /repository_dispatch:/);
    assert.match(build, /Verify package version matches tag/);
    assert.equal((publish.match(/observed_main_commit=/g) ?? []).length, 2);
    assert.ok(publish.indexOf('Verify remote main and the release tag') < positions[1]);
    assert.match(publish, /CONSUMER_TAGS: .*stable/);
  } else {
    assert.match(build, /ref: \$\{\{ github.sha \}\}/);
    assert.doesNotMatch(build, /ref: \$\{\{ needs.supply_chain_gate.outputs.commit_sha/);
    assert.match(publish, /if: github.event_name == 'workflow_dispatch' && github.ref == 'refs\/heads\/main'/);
    for (const path of ['deploy/ghcr/**', 'deploy/aws/**', '.github/workflows/release.yml']) assert.ok(workflow.includes(path));
  }
});
test('new regression and shared OCI/scan tests execute under existing every-PR health gate', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts.test.includes('pnpm deploy:ghcr:test'));
  assert.ok(pkg.scripts['deploy:ghcr:test'].includes('validate-trivy-image.test.mjs'));
  assert.ok(pkg.scripts['deploy:ghcr:test'].includes('inspect-oci-image.test.py'));
  assert.match(read('.github/workflows/app-validation.yml'), /run: pnpm health/);
});
