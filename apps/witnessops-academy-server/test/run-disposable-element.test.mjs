import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Static checks of the CI-only disposable Element journey (it never runs locally).
const script = readFileSync(new URL('./run-disposable-element.sh', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../../../.github/workflows/academy-e2e.yml', import.meta.url), 'utf8');
const PINS = {
  'docker.io/matrixdotorg/synapse:v1.165.0': 'sha256:673b4223c81a7634fd07d832b939a58f97081cfdaae7cdd2d1664cdcf7611b62',
  'docker.io/vectorim/element-web:v1.12.35': 'sha256:406b48b80153818284a235fa3600b2a5b5b6b0aa0e4ef4896b36d8d3461352f3',
};

test('disposable Synapse and Element images are digest-pinned and recorded in the workflow (L-4)', () => {
  for (const [image, digest] of Object.entries(PINS)) {
    assert.ok(script.includes(`'${image}@${digest}'`), image);
    assert.ok(workflow.includes(image) && workflow.includes(digest), image);
  }
  for (const line of script.split('\n').filter(l => /^(SYNAPSE|ELEMENT)_IMAGE=/.test(l)))
    assert.match(line, /@sha256:[0-9a-f]{64}'$/);
});

test('the synthetic Matrix password never appears in argv (I-5)', () => {
  const register = script.slice(script.indexOf('register_new_matrix_user'), script.indexOf('>/dev/null', script.indexOf('register_new_matrix_user')));
  assert.ok(register.includes('--password-file /dev/stdin'));
  assert.doesNotMatch(register, /\s-p\s|--password\s/);
  assert.doesNotMatch(script, /\$\(cat "\$ACADEMY_CI_SECRET_DIR\/matrix_learner_password"\)/);
});

test('diagnostics redact runs of 32 or more token characters, below the 48-hex secrets (I-7)', () => {
  const sed = script.split('\n').find(l => l.includes('[REDACTED]'));
  assert.ok(sed);
  assert.match(sed, /\{32,\}/);
  assert.ok(script.includes('openssl rand -hex 24'), 'generated secrets are 48 hex characters');
});

test('element-config.json carries no secrets and is guarded at runtime', () => {
  const start = script.indexOf(`cat > "$LAB/element-config.json" <<'JSON'\n`);
  assert.ok(start > 0, 'quoted heredoc: no shell expansion into the config');
  const body = script.slice(script.indexOf('\n', start) + 1, script.indexOf('\nJSON\n', start));
  const config = JSON.parse(body);
  const keys = [];
  const walk = (value, path = '') => {
    if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { keys.push(k); walk(v, `${path}.${k}`); }
    else if (typeof value === 'string') assert.doesNotMatch(value, /[A-Za-z0-9_+/=-]{32,}/, `${path} looks like a credential`);
  };
  walk(config);
  for (const key of keys) assert.doesNotMatch(key, /secret|password|passwd|token|bearer|access_key|private/i, key);
  assert.doesNotMatch(body, /\$|registration_shared_secret|matrix_learner_password/);
  assert.ok(script.indexOf('element-config.json contains credential material') < script.indexOf(`chmod 644 "$LAB/element-config.json"`));
});

test('the run-disposable-element script has no shellcheck SC2155 export-with-substitution', () => {
  assert.doesNotMatch(script, /^export [A-Z_]+="[^"]*\$\(/m);
});

test('widget setup targets only the loopback test homeserver and the fixture widget ID', () => {
  const start = script.indexOf(`python3 - "$ACADEMY_CI_SECRET_DIR/matrix_learner_password" "$LAB/room-id" <<'PY'`);
  assert.ok(start > 0);
  const setup = script.slice(start, script.indexOf('\nPY\n', start));
  assert.ok(setup.includes("base='http://127.0.0.1:18008'"));
  const urls = [...setup.matchAll(/https?:\/\/[^'"\s]+/g)].map(m => m[0]);
  assert.deepEqual([...new Set(urls)].sort(), [
    'http://127.0.0.1:18008',
    'http://127.0.0.1:18300/academy/learn/report-or-evidence?format=matrix',
  ]);
  // Every request goes through request(), which prefixes the loopback base.
  assert.match(setup, /urllib\.request\.Request\(base\+path/);
  assert.equal(setup.split('urllib.request.Request(').length, 2, 'single request helper');
  const stateKeys = [...setup.matchAll(/state\+'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(stateKeys, ['im.vector.modular.widgets/academy-decision-room', 'io.element.widgets.layout/']);
  assert.match(setup, /'id':'academy-decision-room'/);
  const layout = setup.slice(setup.indexOf("io.element.widgets.layout/"));
  assert.deepEqual([...layout.matchAll(/'widgets':\{'([^']+)'/g)].map(m => m[1]), ['academy-decision-room']);
  assert.doesNotMatch(setup, /witnessops\.com|matrix\.org|community\./i);
});
