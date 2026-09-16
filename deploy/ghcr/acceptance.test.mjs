import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { verify, evidence, sha } from './evidence.mjs';
import { publish } from './publish.mjs';
import { scanEnvironment } from './scan.mjs';
import { fixture } from './fixture.mjs';

function setup(t) { const f = fixture(); t.after(() => rmSync(f.dir, { recursive: true, force: true })); return f; }
test('matching original evidence passes and publication reads back candidate before promotion', t => {
  const f = setup(t);
  assert.equal(verify(f.dir, f.env).source_commit, f.env.SOURCE_COMMIT);
  const staged = publish('stage', f.dir, f.env, f.registry);
  assert.equal(staged.status, 'verified');
  assert.equal(f.calls.filter(a => a[1] === 'import').length, 1);
  assert.equal(f.calls.filter(a => a[1] === 'copy').length, 0);
  assert.equal(publish('promote', f.dir, f.env, f.registry).verified.length, 1);
});
for (const severity of ['CRITICAL', 'HIGH']) for (const fixed of ['', '1.2.3']) {
  test(`reject ${severity} fixedVersion=${fixed || 'unfixed'}`, t => {
    const f = setup(t);
    f.report.Results[1].Vulnerabilities = [{ Severity: severity, FixedVersion: fixed }];
    f.reportWrite();
    assert.throws(() => evidence(f.dir, f.env));
    assert.throws(() => publish('stage', f.dir, f.env, f.registry));
    assert.equal(f.calls.length, 0);
  });
}
test('medium low and unknown retained and non-blocking', t => {
  const f = setup(t);
  f.report.Results[1].Vulnerabilities = ['MEDIUM', 'LOW', 'UNKNOWN'].map(Severity => ({ Severity }));
  f.reportWrite(); f.bind();
  assert.deepEqual(verify(f.dir, f.env).counts, { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 1, UNKNOWN: 1 });
});
for (const [name, change] of [
  ['OS coverage', r => r.Results.shift()], ['npm coverage', r => r.Results.pop()],
  ['inventory', r => delete r.Results], ['scanner version', r => delete r.Trivy],
  ['scan time', r => delete r.CreatedAt], ['architecture', r => r.Metadata.ImageConfig.architecture = 'arm64'],
  ['config', r => r.Metadata.ImageID = 'sha256:' + 'f'.repeat(64)],
  ['filtered findings', r => r.Results[0].ModifiedFindings = [{ Status: 'ignored' }]],
  ['invalid findings', r => r.Results[0].Vulnerabilities = {}],
  ['incomplete schema', r => delete r.SchemaVersion],
]) test(`reject missing/wrong ${name}`, t => {
  const f = setup(t); change(f.report); f.reportWrite(); assert.throws(() => evidence(f.dir, f.env));
});
for (const data of [null, '', '{broken', '{}']) test(`reject absent/malformed report ${data}`, t => {
  const f = setup(t), path = join(f.dir, 'trivy.json');
  if (data === null) rmSync(path); else writeFileSync(path, data);
  assert.throws(() => verify(f.dir, f.env));
});
for (const key of ['SOURCE_COMMIT', 'BUILD_SOURCE_COMMIT', 'GATE_SOURCE_COMMIT', 'GITHUB_WORKFLOW_SHA',
  'EXPECTED_IMAGE_ARCHIVE_SHA256', 'EXPECTED_REPORT_SHA256', 'EXPECTED_BINDING_SHA256',
  'EXPECTED_MANIFEST_DIGEST', 'EXPECTED_CONFIG_DIGEST', 'GITHUB_REPOSITORY', 'GITHUB_WORKFLOW_REF',
  'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'BUILD_RUN_ID', 'BUILD_RUN_ATTEMPT']) {
  test(`reject substituted ${key}`, t => {
    const f = setup(t); f.env[key] = f.env[key].replace(/./g, '9');
    assert.throws(() => publish('stage', f.dir, f.env, f.registry));
    assert.equal(f.calls.length, 0);
  });
}
for (const state of ['failure', 'cancelled', 'skipped', '', undefined, 'unexpected']) test(`reject verifier result ${state}`, t => {
  const f = setup(t); f.env.VERIFIER_RESULT = state;
  assert.throws(() => publish('stage', f.dir, f.env, f.registry)); assert.equal(f.calls.length, 0);
});
test('binding cannot replace original report with a supplied PASS', t => {
  const f = setup(t), path = join(f.dir, 'binding.json');
  writeFileSync(path, '{"result":"PASS"}');
  f.env.EXPECTED_BINDING_SHA256 = sha(readFileSync(path));
  assert.throws(() => verify(f.dir, f.env));
});
for (const kind of ['manifest', 'blob', 'digest']) test(`registry ${kind} mismatch fails without promotion and retains attempted reference`, t => {
  const f = setup(t);
  const registry = args => (args[0] === kind || args[1] === kind) ? Buffer.from('wrong') : f.registry(args);
  assert.throws(() => publish('stage', f.dir, f.env, registry));
  const receipt = JSON.parse(readFileSync(join(f.dir, 'registry-stage.json')));
  assert.equal(receipt.status, 'failed'); assert.equal(receipt.attempted.length, 1);
  assert.equal(receipt.verified.length, 0); assert.equal(f.calls.some(a => a[1] === 'copy'), false);
  assert.throws(() => publish('promote', f.dir, f.env, registry));
  assert.equal(f.calls.some(a => a[1] === 'copy'), false);
});
test('partial promotion records which references may remain', t => {
  const f = setup(t); f.env.CONSUMER_TAGS = '["stable","version"]';
  const reg = args => args[0] === 'manifest' && args[2].endsWith(':version') ? Buffer.from('bad') : f.registry(args);
  assert.throws(() => publish('promote', f.dir, f.env, reg));
  const receipt = JSON.parse(readFileSync(join(f.dir, 'registry-promote.json')));
  assert.equal(receipt.attempted.length, 2); assert.equal(receipt.verified.length, 1);
});
test('inherited Trivy filtering is excluded without replacing shared policy', () => {
  assert.deepEqual(scanEnvironment({ PATH: '/bin', TRIVY_SEVERITY: 'LOW', TRIVY_IGNORE_UNFIXED: 'true', TRIVY_SKIP_DIRS: '/' }), { PATH: '/bin' });
});
