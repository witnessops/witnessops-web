import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../keycloak/kc_admin.py', import.meta.url));
for (const [name, env, username, message] of [
  ['missing test flag', { KC_CREATE_TEST_USERS: '0', KC_ADMIN_BASE_URL: 'https://127.0.0.1:1' }, 'learner-new-12345678', 'disposable loopback'],
  ['remote identity provider', { KC_CREATE_TEST_USERS: '1', KC_ADMIN_BASE_URL: 'https://identity.example.invalid' }, 'learner-new-12345678', 'disposable loopback'],
  ['nonfixture account name', { KC_CREATE_TEST_USERS: '1', KC_ADMIN_BASE_URL: 'https://127.0.0.1:1' }, 'administrator', 'synthetic first-use username'],
]) {
  test('first-use helper refuses ' + name + ' before credentials or networking', () => {
    const result = spawnSync('python3', [script, 'create-test-invitee', username], { encoding: 'utf8',
      env: { ...process.env, ...env, ACADEMY_PUBLIC_ORIGIN: 'http://127.0.0.1:18300', KC_ADMIN_PASSWORD_FILE: '/nonexistent/synthetic-password-not-read', PYTHONDONTWRITEBYTECODE: '1' } });
    assert.equal(result.error, undefined, 'helper must actually execute');
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(message));
    assert.equal(result.stdout, '');
  });
}

test('successful synthetic invitee command emits one parseable JSON object', () => {
  const code = `import sys
from pathlib import Path
sys.path.insert(0,str(Path(sys.argv[1]).parent))
import kc_admin as helper
helper.CREATE_TEST_USERS=True
helper.KC='http://127.0.0.1:1'
helper.token=lambda:'synthetic-not-used'
helper.secret=lambda name:'synthetic-password-not-printed'
replies=iter([(200,[]),(201,{}),(200,[{'id':'00000000-0000-4000-8000-000000000099'}]),(204,{})])
helper.req=lambda *args,**kwargs:next(replies)
helper.create_test_invitee('learner-new-12345678')`;
  const result = spawnSync('python3', ['-c', code, script], { encoding: 'utf8',
    env: { ...process.env, KC_ADMIN_BASE_URL: 'http://127.0.0.1:1', ACADEMY_PUBLIC_ORIGIN: 'http://127.0.0.1:18300', PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { subject: '00000000-0000-4000-8000-000000000099', username: 'learner-new-12345678' });
  assert.equal(result.stdout.includes('password'), false);
});
