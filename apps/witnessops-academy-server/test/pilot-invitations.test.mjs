import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { preparePilotInvitationCapture } from '../scripts/prepare-pilot-invitations.mjs';
import {
  InvitationInputError, MAX_INVITATION_SECONDS, PILOT_COURSE_ID,
  createInvitationBatch, hasApprovedFreeGrant, invitationTokenHash,
  previewInvitation, redeemInvitation, renderCapturedInvitationEmail,
  revokeFreeGrant, revokeInvitation, validateInvitationBatch,
} from '../src/pilot-invitations.mjs';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const TOKEN = Buffer.alloc(32, 7).toString('base64url');
const BASE = {
  recipients: [{ issuer: 'https://idp.example.invalid/realms/academy', subject: 'synthetic-learner-a' }],
  approvalReference: 'synthetic-founder-free-pilot-approval',
  administratorReference: 'synthetic-operator-a',
};

function fakeOperator({ reservedCount = 1, alreadyRecorded = false, failInsert = false } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('WITH requested')) return { rows: [{ reserved_count: reservedCount, recipient_already_recorded: alreadyRecorded }] };
      if (sql.includes('INSERT INTO public.academy_pilot_invitations')) {
        if (failInsert) throw Object.assign(new Error('synthetic unavailable'), { code: '08006' });
        return { rows: [{ id: A, course_id: PILOT_COURSE_ID, access_kind: 'approved_free', role: 'learner', expires_at: new Date('2030-01-01T00:00:00Z') }] };
      }
      return { rows: [] };
    },
    release() { released = true; },
  };
  return { connect: async () => client, calls, released: () => released };
}

test('a batch requires explicit named issuer/subject recipients and both approval references', () => {
  const valid = validateInvitationBatch(BASE);
  assert.deepEqual(valid.recipients, BASE.recipients);
  assert.equal(valid.expiresInSeconds, MAX_INVITATION_SECONDS);
  for (const field of ['approvalReference', 'administratorReference']) {
    assert.throws(() => validateInvitationBatch({ ...BASE, [field]: '' }), InvitationInputError);
  }
  for (const recipients of [[], Array.from({ length: 5 }, (_, i) => ({ ...BASE.recipients[0], subject: 'learner-' + i }))]) {
    assert.throws(() => validateInvitationBatch({ ...BASE, recipients }), InvitationInputError);
  }
});

test('email, browser owner IDs, paid, administrator and community grant overrides are rejected', () => {
  for (const extra of [{ accessKind: 'paid' }, { role: 'admin' }, { community: true }, { owner_id: A }, { price: 149 }]) {
    assert.throws(() => validateInvitationBatch({ ...BASE, ...extra }), InvitationInputError);
  }
  for (const extra of [{ email: 'a@example.invalid' }, { identityId: A }, { role: 'admin' }]) {
    assert.throws(() => validateInvitationBatch({ ...BASE, recipients: [{ ...BASE.recipients[0], ...extra }] }), InvitationInputError);
  }
});

test('duplicate recipients and unsafe issuer/reference forms fail before database access', () => {
  assert.throws(() => validateInvitationBatch({ ...BASE, recipients: [BASE.recipients[0], BASE.recipients[0]] }), /duplicate_recipient/);
  for (const issuer of ['http://remote.example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/?token=x']) {
    assert.throws(() => validateInvitationBatch({ ...BASE, recipients: [{ issuer, subject: 'a' }] }), InvitationInputError);
  }
  assert.throws(() => validateInvitationBatch({ ...BASE, approvalReference: 'approval\nforged-log' }), InvitationInputError);
  assert.equal(validateInvitationBatch({ ...BASE, recipients: [{ issuer: 'http://127.0.0.1:9000/realms/test', subject: 'a' }] }).recipients.length, 1);
});

test('invitation expiry is bounded to seven days, never caller-selected arbitrary duration', () => {
  for (const expiresInSeconds of [0, -1, MAX_INVITATION_SECONDS + 1, 1.1, '60', NaN]) {
    assert.throws(() => validateInvitationBatch({ ...BASE, expiresInSeconds }), InvitationInputError);
  }
  assert.equal(validateInvitationBatch({ ...BASE, expiresInSeconds: 60 }).expiresInSeconds, 60);
});

test('only canonical 32-byte invitation bearers are accepted', () => {
  assert.match(invitationTokenHash(TOKEN), /^[0-9a-f]{64}$/);
  for (const token of ['', 'a'.repeat(42), 'a'.repeat(44), TOKEN + '=', '?token=' + TOKEN, 'A'.repeat(42) + 'B']) {
    assert.throws(() => invitationTokenHash(token), InvitationInputError);
  }
});

test('creation stores only SHA256 and returns an unpredictable bearer once after commit', async () => {
  const db = fakeOperator();
  const first = await createInvitationBatch(db, BASE);
  const second = await createInvitationBatch(fakeOperator(), BASE);
  assert.equal(first.ok, true);
  const invite = first.invitations[0];
  assert.equal(invite.courseId, PILOT_COURSE_ID);
  assert.equal(invite.accessKind, 'approved_free');
  assert.equal(invite.role, 'learner');
  assert.notEqual(invite.token, second.invitations[0].token);
  assert.equal(Buffer.from(invite.token, 'base64url').length, 32);
  const insertion = db.calls.find((call) => call.sql.includes('INSERT INTO'));
  assert.equal(insertion.params[0], invitationTokenHash(invite.token));
  assert.equal(JSON.stringify(db.calls).includes(invite.token), false);
  assert.equal(db.calls.at(-1).sql, 'COMMIT');
  assert.equal(db.released(), true);
});

test('operator errors roll the whole batch back and release the client', async () => {
  const db = fakeOperator({ failInsert: true });
  await assert.rejects(createInvitationBatch(db, BASE), /synthetic unavailable/);
  assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(db.calls.some((call) => call.sql === 'COMMIT'), false);
  assert.equal(db.released(), true);
});

test('capacity and existing recipient checks fail without creating invitations', async () => {
  for (const options of [{ reservedCount: 5 }, { alreadyRecorded: true }]) {
    const db = fakeOperator(options);
    await assert.rejects(createInvitationBatch(db, BASE), InvitationInputError);
    assert.equal(db.calls.some((call) => call.sql.includes('INSERT INTO')), false);
    assert.equal(db.calls.at(-1).sql, 'ROLLBACK');
  }
});

test('runtime preview/redeem call only the restricted functions with a hash and session UUID', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ invitation_id: A, grant_id: B, expires_at: '2030-01-01T00:00:00Z' }] };
  } };
  assert.equal((await previewInvitation(db, { token: TOKEN, identityId: A })).eligible, true);
  const redeemed = await redeemInvitation(db, { token: TOKEN, identityId: A });
  assert.equal(redeemed.grantId, B);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.deepEqual(call.params, [invitationTokenHash(TOKEN), A]);
    assert.match(call.sql, /^SELECT \* FROM public\.academy_(preview|redeem)_pilot_invitation/);
    assert.equal(call.sql.includes('INSERT'), false);
    assert.equal(JSON.stringify(call).includes(TOKEN), false);
  }
});

test('invalid/mismatched/expired/revoked/replayed preview and redeem expose one generic denial', async () => {
  const empty = { query: async () => ({ rows: [] }) };
  assert.deepEqual(await previewInvitation(empty, { token: TOKEN, identityId: B }), { ok: false, eligible: false, accepted: false, error: 'invitation_unavailable' });
  assert.deepEqual(await redeemInvitation(empty, { token: TOKEN, identityId: B }), { ok: false, eligible: false, accepted: false, error: 'invitation_unavailable' });
  // These doubles verify API non-disclosure only. Actual denial/locking requires the separate PostgreSQL suite.
});

test('unexpected browser owner/scope fields and malformed identities never reach PostgreSQL', async () => {
  let called = false;
  const db = { query: async () => { called = true; return { rows: [] }; } };
  for (const fn of [previewInvitation, redeemInvitation]) {
    await assert.rejects(fn(db, { token: TOKEN, identityId: A, owner_id: B }), InvitationInputError);
    await assert.rejects(fn(db, { token: TOKEN, identityId: 'email@example.invalid' }), InvitationInputError);
    await assert.rejects(fn(db, { token: 'bad', identityId: A }), InvitationInputError);
  }
  assert.equal(called, false);
});

test('grant lookup is scoped to the trusted identity, fixed course and nonrevoked free learner grant', async () => {
  const db = { query: async (sql, params) => {
    assert.deepEqual(params, [A, PILOT_COURSE_ID]);
    assert.match(sql, /identity_id = \$1/);
    assert.match(sql, /revoked_at IS NULL/);
    assert.match(sql, /access_kind = 'approved_free'/);
    return { rows: [{ '?column?': 1 }] };
  } };
  assert.equal(await hasApprovedFreeGrant(db, { identityId: A }), true);
  assert.equal(await hasApprovedFreeGrant({ query: async () => ({ rows: [] }) }, { identityId: B }), false);
});

test('owner-only invite and grant revocation are separate and never modify saved work', async () => {
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ id: A }] }; } };
  assert.equal((await revokeInvitation(db, { invitationId: A, administratorReference: 'synthetic-revoke-invite' })).ok, true);
  assert.equal((await revokeFreeGrant(db, { identityId: B, administratorReference: 'synthetic-revoke-grant' })).ok, true);
  assert.match(calls[0].sql, /redeemed_at IS NULL/);
  assert.match(calls[1].sql, /identity_id = \$1/);
  assert.equal(calls.some((call) => call.sql.includes('academy_lesson_drafts')), false);
});

test('captured email keeps the bearer in a fragment and does not accept real recipient delivery', () => {
  const email = renderCapturedInvitationEmail({ token: TOKEN, academyOrigin: 'https://academy.example.invalid', recipientEmail: 'learner-a@example.invalid' });
  assert.equal(email.captured, true);
  const link = new URL(email.text.match(/https:\/\/[^\s]+/)[0]);
  assert.equal(link.pathname, '/academy/invitation');
  assert.equal(link.search, '');
  assert.equal(link.hash, '#token=' + TOKEN);
  assert.throws(() => renderCapturedInvitationEmail({ token: TOKEN, academyOrigin: 'https://academy.example.invalid', recipientEmail: 'real@example.com' }), /captured_email_only/);
  assert.throws(() => renderCapturedInvitationEmail({ token: TOKEN, academyOrigin: 'https://academy.example.invalid/redirect', recipientEmail: 'a@example.invalid' }), InvitationInputError);
});


test('operator CLI defaults to validation only, creates no captures and rejects real delivery or public batch files', async () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'academy-invitation-cli-test-'));
  async function run(args) {
    let stdout = '';
    let stderr = '';
    const status = await preparePilotInvitationCapture(args, {
      output: (value) => { stdout += value + '\n'; },
      errorOutput: (value) => { stderr += value + '\n'; },
    });
    return { status, stdout, stderr };
  }
  const batchPath = path.join(temp, 'batch.json');
  const captureDir = path.join(temp, 'capture');
  const batch = {
    ...BASE,
    academyOrigin: 'https://academy.example.invalid',
    recipients: [{ ...BASE.recipients[0], deliveryEmail: 'synthetic@example.invalid' }],
  };
  try {
    writeFileSync(batchPath, JSON.stringify(batch), { mode: 0o600 });
    const prepared = await run(['--batch', batchPath, '--capture-dir', captureDir]);
    assert.equal(prepared.status, 0);
    const result = JSON.parse(prepared.stdout);
    assert.equal(result.state, 'PREPARED_DRY_RUN');
    assert.equal(result.databaseConnected, false);
    assert.equal(result.invitationsIssued, false);
    assert.equal(existsSync(captureDir), false);
    writeFileSync(batchPath, JSON.stringify({ ...batch, recipients: [{ ...batch.recipients[0], deliveryEmail: 'real@example.com' }] }));
    const real = await run(['--batch', batchPath]);
    assert.equal(real.status, 1);
    assert.equal(JSON.parse(real.stderr).error, 'captured_email_only');
    writeFileSync(batchPath, JSON.stringify(batch));
    chmodSync(batchPath, 0o644);
    const publicFile = await run(['--batch', batchPath]);
    assert.equal(publicFile.status, 1);
    assert.equal(JSON.parse(publicFile.stderr).error, 'private_file_required');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('captured invitation links permit disposable loopback HTTP but reject remote HTTP', () => {
  const email = renderCapturedInvitationEmail({ token: TOKEN, academyOrigin: 'http://127.0.0.1:18300', recipientEmail: 'learner@example.invalid' });
  assert.ok(email.text.includes('http://127.0.0.1:18300/academy/invitation#token='));
  assert.throws(() => renderCapturedInvitationEmail({ token: TOKEN, academyOrigin: 'http://remote.example.invalid', recipientEmail: 'learner@example.invalid' }), InvitationInputError);
});
