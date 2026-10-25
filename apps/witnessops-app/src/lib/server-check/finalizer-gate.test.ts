import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CliError, requireCliScope } from '../db/cli-auth';
import { finalizerEnabled } from '../finalizer-config';
import { createServerCheckService } from './service';
import { LocalAuditFinalizer } from './runtime';
import type { ServerCheckStore } from './store';

const origin = 'http://127.0.0.1:3020';
const id = '11111111-1111-4111-8111-111111111111';
const configured = {
  python: '/usr/bin/false',
  key: '/no/such/finalizer-key',
  signer: 'witnessops_local_audit_prod_2026_01',
  root: '',
};

function refused(error: unknown) {
  return error instanceof CliError && error.code === 'finalizer_unavailable' && error.status === 503;
}

test('finalizer flag is off unless the operator sets the exact value 1', () => {
  assert.equal(finalizerEnabled({}), false);
  for (const value of [undefined, '', '0', 'true', 'yes', '1 ', '01']) assert.equal(finalizerEnabled({ WITNESSOPS_FINALIZER_ENABLED: value }), false);
  assert.equal(finalizerEnabled({ WITNESSOPS_FINALIZER_ENABLED: '1' }), true);
});

test('server_check:create is refused while the flag is off and issued when it is on', () => {
  assert.equal(requireCliScope(undefined, false), 'cli:session');
  assert.equal(requireCliScope('cli:session', false), 'cli:session');
  assert.throws(() => requireCliScope('cli:session server_check:create', false), refused);
  assert.equal(requireCliScope('cli:session server_check:create', true), 'cli:session server_check:create');
  assert.throws(() => requireCliScope('cli:session other', true), (error: unknown) => error instanceof CliError && error.code === 'invalid_scope' && error.status === 400);
  const prior = process.env.WITNESSOPS_FINALIZER_ENABLED;
  delete process.env.WITNESSOPS_FINALIZER_ENABLED;
  try { assert.throws(() => requireCliScope('cli:session server_check:create'), refused); }
  finally { if (prior === undefined) delete process.env.WITNESSOPS_FINALIZER_ENABLED; else process.env.WITNESSOPS_FINALIZER_ENABLED = prior; }
});

test('flag off returns 503 finalizer_unavailable before custody or the producer', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'finalizer-off-'));
  try {
    const finalizer = new LocalAuditFinalizer({ ...configured, root }, false);
    await assert.rejects(finalizer.preflight(), refused);
    await assert.rejects(finalizer.reconcileCapture(id, Buffer.from('x')), refused);
    await assert.rejects(finalizer.validate(id, Buffer.alloc(0)), refused);
    await assert.rejects(finalizer.finalize(id, Buffer.from('{}')), refused);
    await assert.rejects(stat(path.join(root, 'preflight')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('flag on keeps the existing custody failure and still reaches the producer adapter', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'finalizer-on-'));
  try {
    await assert.rejects(new LocalAuditFinalizer({ ...configured, root: '' }, true).preflight(), refused);
    await chmod(root, 0o755);
    await assert.rejects(new LocalAuditFinalizer({ ...configured, root }, true).preflight(), refused);
    await assert.rejects(stat(path.join(root, 'preflight')));
    await chmod(root, 0o700);
    await assert.rejects(new LocalAuditFinalizer({ ...configured, root }, true).preflight(), (error: unknown) => error instanceof CliError && error.code === 'finalization_failed' && error.status === 422);
    assert.equal((await stat(path.join(root, 'preflight'))).isDirectory(), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('server-check HTTP maps a disabled finalizer to 503 and an enabled preflight to its previous response', async () => {
  const headers = { host: '127.0.0.1:3020', origin, authorization: 'Bearer ' + 'a'.repeat(43) };
  const request = () => new Request(`${origin}/api/cli/server-checks`, { headers });
  const disabled = new LocalAuditFinalizer(configured, false);
  const off = createServerCheckService({
    context: async () => { await disabled.preflight(); return { ready: false }; },
  } as unknown as ServerCheckStore, origin);
  const denied = await off(request());
  assert.equal(denied.status, 503);
  assert.deepEqual(await denied.json(), { code: 'finalizer_unavailable' });
  const on = createServerCheckService({
    context: async () => ({ workspaceId: id, collectorHash: 'a'.repeat(64) }),
  } as unknown as ServerCheckStore, origin);
  const allowed = await on(request());
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).collectorHash, 'a'.repeat(64));
});
