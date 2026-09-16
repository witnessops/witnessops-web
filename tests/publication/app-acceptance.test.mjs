import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(new URL('../../apps/witnessops-web/package.json', import.meta.url));
const { load } = require('js-yaml');
const workflow = load(readFileSync(new URL('../../.github/workflows/app-validation.yml', import.meta.url), 'utf8'));
const gate = workflow.jobs.acceptance;
const keys = ['supply_chain_gate', 'app', 'image'];
const success = () => Object.fromEntries(keys.map(key => [key, { result: 'success' }]));
function execute(value) {
  return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', gate.steps[0].run], {
    env: { PATH: process.env.PATH, APP_ACCEPTANCE_NEEDS: value }, encoding: 'utf8',
  });
}
test('workflow aggregate has stable name, all direct needs, always and no authority or installs', () => {
  assert.equal(gate.name, 'App acceptance');
  assert.deepEqual([...gate.needs].sort(), [...keys].sort());
  assert.equal(gate.if, 'always()');
  assert.deepEqual(gate.permissions, {});
  assert.equal(gate.steps.length, 1);
  assert.equal(gate.steps[0].env.APP_ACCEPTANCE_NEEDS, '${{ toJSON(needs) }}');
  assert.equal(gate.steps[0].shell, 'bash');
  assert.equal(gate.environment, undefined);
  assert.equal(gate.secrets, undefined);
  assert.equal(gate.steps[0].uses, undefined);
  for (const id of [...keys, 'acceptance']) {
    assert.equal(workflow.jobs[id]['continue-on-error'], undefined);
    for (const step of workflow.jobs[id].steps ?? []) assert.equal(step['continue-on-error'], undefined);
  }
  assert.deepEqual(workflow.on.pull_request, null);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_call'));
});
test('actual inline gate accepts all successful prerequisites', () => assert.equal(execute(JSON.stringify(success())).status, 0));
for (const key of keys) {
  for (const state of ['failure', 'cancelled', 'skipped', '', 'neutral', 'pending', 'SUCCESS', null, true]) {
    test(`${key} ${JSON.stringify(state)} is rejected`, () => {
      const input = success(); input[key].result = state;
      assert.equal(execute(JSON.stringify(input)).status, 1);
    });
  }
  test(`missing ${key} is rejected`, () => {
    const input = success(); delete input[key]; assert.equal(execute(JSON.stringify(input)).status, 1);
  });
  test(`missing result in ${key} is rejected`, () => {
    const input = success(); input[key] = {}; assert.equal(execute(JSON.stringify(input)).status, 1);
  });
}
for (const input of ['', 'not json', '{}', 'null', '[]', 'true', '"success"']) {
  test(`invalid input ${JSON.stringify(input)} fails closed`, () => assert.equal(execute(input).status, 1));
}
test('unexpected prerequisite fails closed', () => assert.equal(execute(JSON.stringify({ ...success(), other: { result: 'success' } })).status, 1));
test('safe diagnostics uploads only one summary with short retention; image JSON preserved', () => {
  const steps = workflow.jobs.app.steps;
  const collect = steps.find(s => s.env?.APP_STEP_RESULTS);
  assert.equal(collect.if, 'always()');
  assert.equal(collect.run, 'node tests/publication/safe-ci-diagnostics.mjs');
  const upload = steps.find(s => s.with?.name === 'app-test-diagnostics');
  assert.equal(upload.if, 'always()'); assert.equal(upload.with['retention-days'], 3);
  assert.equal(upload.with.path, '${{ runner.temp }}/app-safe-diagnostics/summary.json');
  const image = workflow.jobs.image.steps.find(s => s.with?.name === 'app-image-validation');
  assert.equal(image.with.path.trim(), 'artifacts/app-validation/*.json');
  assert.equal(image.with['retention-days'], 3);
});
for (const variant of ['valid', 'missing', 'malformed', 'symlink']) {
  test(`actual diagnostics collector is allowlisted with ${variant} browser output`, () => {
    const root = mkdtempSync(join(tmpdir(), 'app-diagnostics-test-'));
    try {
      const path = join(root, 'wops-app-foundation-browser'); mkdirSync(path);
      const sentinel = 'SENSITIVE_COOKIE_PASSWORD_CUSTOMER_CONTENT';
      const browserFile = join(path, '.last-run.json');
      if (variant === 'valid') writeFileSync(browserFile, JSON.stringify({ status: 'failed', failedTests: [sentinel], cookies: sentinel }));
      if (variant === 'malformed') writeFileSync(browserFile, sentinel);
      if (variant === 'symlink') { writeFileSync(join(root, 'secret'), sentinel); symlinkSync(join(root, 'secret'), browserFile); }
      const result = spawnSync(process.execPath, [new URL('./safe-ci-diagnostics.mjs', import.meta.url).pathname], {
        env: { PATH: process.env.PATH, RUNNER_TEMP: root, TMPDIR: root, TMP: root, TEMP: root,
          APP_STEP_RESULTS: JSON.stringify({ db: { outcome: 'failure', outputs: { password: sentinel } }, migration: { outcome: sentinel } }) }, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const raw = readFileSync(join(root, 'app-safe-diagnostics/summary.json'), 'utf8');
      assert.ok(!raw.includes(sentinel)); const data = JSON.parse(raw);
      assert.equal(data.outcomes.db, 'failure'); assert.equal(data.outcomes.migration, 'unknown');
      assert.deepEqual(Object.keys(data), ['outcomes', 'browser']);
      assert.equal(data.browser.availability, variant === 'valid' ? 'available' : 'unavailable');
      if (variant === 'valid') assert.equal(data.browser.failedTests, 1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
