import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixtureEngine, FixtureError, COMMANDS, type Command, type EngineActor, type FixtureEngine } from './engine';
import { CANONICAL_SOURCE_DIGEST, RAW_SOURCE, RAW_SOURCE_DIGEST, SCOPE, digest, hashBytes, validateSource } from './source';
const workspaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const owner: EngineActor = { id: 'owner-account', workspaceId, role: 'owner' };
const reviewer: EngineActor = { id: 'independent-reviewer', workspaceId, role: 'reviewer' };
const create = () => createFixtureEngine({ workspaceId, clock: () => '2026-10-31T12:00:00.000Z' });
const journey: [EngineActor, Command][] = [[owner, 'accept_scope'], [owner, 'submit_evidence'], [reviewer, 'admit_evidence'],
  [reviewer, 'record_review'], [owner, 'accept_report'], [reviewer, 'prepare_delivery'], [reviewer, 'simulate_delivery'], [owner, 'close']];
function advance(engine: FixtureEngine, count = journey.length) { for (const [actor, command] of journey.slice(0, count)) engine.command(actor, command, engine.read(actor).revision); }
const isRefusal = (code: string) => (error: unknown) => error instanceof FixtureError && error.code === code;

test('complete synthetic journey keeps report honest, bytes distinct and recipient allowlisted', () => {
  const engine = create();
  assert.throws(() => engine.recipientReport(owner), isRefusal('report_not_ready'));
  advance(engine);
  const view = engine.read(owner);
  assert.equal(view.stage, 'closed'); assert.equal(view.revision, 8); assert.equal(view.audit.length, 8);
  assert.equal(view.externalActions, 0); assert.equal(view.delivery, 'DELIVERY SIMULATED'); assert.equal(view.ephemeral, true);
  assert.equal(view.review?.reviewerDecision, 'PARTIAL_EVIDENCE');
  assert.equal(view.provenance?.sourceAuthenticity, 'UNKNOWN'); assert.equal(view.provenance?.runtimeApprovalEnforcement, 'UNKNOWN');
  assert.notEqual(view.provenance?.rawDigest, view.provenance?.canonicalDigest);
  assert.equal(view.provenance?.claimedDigest, view.provenance?.canonicalDigest);
  assert.ok(view.unknowns.some(text => text.includes('not independently observed')));
  const recipient = engine.recipientReport(owner);
  assert.equal(recipient.delivery, 'SIMULATED_ONLY_NO_EXTERNAL_SEND');
  for (const forbidden of ['rawBytes', 'declaredValue', 'owner-account', 'independent-reviewer', 'audit', 'reviewerId', 'workspaceId', 'collectedAt']) assert.equal(JSON.stringify(recipient).includes(forbidden), false, forbidden);
  assert.equal(engine.verifySnapshot(engine.snapshotForTesting()).pass, true);
  (view.scope.approvedOperations as unknown as string[])[0] = 'attempt mutation';
  assert.notEqual(engine.read(owner).scope.approvedOperations[0], 'attempt mutation');
});

test('pinned bytes reject alternate serialization, malformed, sensitive, oversized and mismatched claims', () => {
  const evidence = validateSource(RAW_SOURCE);
  assert.equal(hashBytes(evidence.rawBytes), RAW_SOURCE_DIGEST);
  assert.equal(digest(evidence.parsed), CANONICAL_SOURCE_DIGEST);
  for (const raw of ['{', RAW_SOURCE + ' ', JSON.stringify(evidence.parsed), RAW_SOURCE.replace('"fixture": true', '"fixture": false'), RAW_SOURCE.replace('"secretsIncluded": false', '"secretsIncluded": true'), 'x'.repeat(8193)]) assert.throws(() => validateSource(raw));
  assert.throws(() => validateSource(RAW_SOURCE, `sha256:${'0'.repeat(64)}`));
});

for (const mutation of ['stage', 'revision', 'audit_tail', 'recipient', 'source', 'report', 'audit_rehash'] as const) {
  test(`independent current anchor rejects ${mutation} mutation`, () => {
    const engine = create(); advance(engine);
    const snapshot = engine.snapshotForTesting();
    if (mutation === 'stage') snapshot.stage = 'draft';
    if (mutation === 'revision') snapshot.revision = 900;
    if (mutation === 'audit_tail') snapshot.audit.pop();
    if (mutation === 'recipient') snapshot.recipient!.findings[0].title = 'Altered';
    if (mutation === 'source') snapshot.evidence!.rawBytes += ' ';
    if (mutation === 'report') snapshot.review!.reviewerDecision = 'VERIFIED' as 'PARTIAL_EVIDENCE';
    if (mutation === 'audit_rehash') { snapshot.audit[0].actor.id = 'reassigned'; const { hash: _hash, ...unsigned } = snapshot.audit[0]; snapshot.audit[0].hash = digest(unsigned); }
    assert.equal(engine.verifySnapshot(snapshot).pass, false);
    assert.equal(engine.verifySnapshot(engine.snapshotForTesting()).pass, true);
  });
}

test('stale snapshot with internally valid history cannot claim current-state verification', () => {
  const engine = create(); const old = engine.snapshotForTesting(); advance(engine, 1);
  assert.equal(engine.verifySnapshot(old).pass, false);
});

test('client role, cross tenant, self review, skipped and duplicate transitions cannot advance state', () => {
  const engine = create();
  assert.throws(() => engine.command({ ...owner, role: 'viewer' as 'owner' }, 'accept_scope', 0), isRefusal('role_denied'));
  assert.throws(() => engine.command({ ...owner, workspaceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }, 'accept_scope', 0), isRefusal('workspace_mismatch'));
  assert.throws(() => engine.command(owner, 'close', 0), isRefusal('transition_denied'));
  advance(engine, 2);
  assert.throws(() => engine.command({ ...owner, role: 'reviewer' }, 'admit_evidence', 2), isRefusal('independent_reviewer_required'));
  assert.throws(() => engine.command(owner, 'record_review', 2), isRefusal('role_denied'));
  assert.throws(() => engine.command(owner, 'submit_evidence', 2), isRefusal('transition_denied'));
  assert.throws(() => engine.command(owner, 'accept_scope', 0), isRefusal('revision_conflict'));
  assert.equal(engine.read(owner).stage, 'evidence_submitted'); assert.equal(engine.read(owner).revision, 2);
  assert.equal(engine.read(owner).deniedCount, 7); assert.equal(engine.read(owner).integrity.pass, true);
});

test('customer acceptance is required before preparing recipient and delivery is always simulated', () => {
  const engine = create(); advance(engine, 4);
  assert.throws(() => engine.command(reviewer, 'accept_report', 4), isRefusal('role_denied'));
  assert.throws(() => engine.command(reviewer, 'prepare_delivery', 4), isRefusal('transition_denied'));
  assert.throws(() => engine.recipientReport(reviewer), isRefusal('report_not_ready'));
  engine.command(owner, 'accept_report', 4); engine.command(reviewer, 'prepare_delivery', 5);
  assert.equal(engine.recipientReport(owner).delivery, 'SIMULATED_ONLY_NO_EXTERNAL_SEND');
});

test('held is terminal and denial history is bounded and sanitized', () => {
  const engine = create(); advance(engine, 2); engine.command(reviewer, 'hold', 2);
  assert.equal(engine.read(reviewer).stage, 'held');
  assert.deepEqual(engine.read(reviewer).allowedCommands, []);
  for (let i = 0; i < 130; i++) assert.throws(() => engine.command(owner, 'secret-caller-supplied-operation', 3), isRefusal('unknown_operation'));
  assert.equal(engine.read(owner).deniedCount, 130); assert.equal(engine.read(owner).denied.length, 100);
  assert.equal(JSON.stringify(engine.snapshotForTesting()).includes('secret-caller-supplied-operation'), false);
  assert.equal(engine.read(owner).integrity.pass, true);
});

test('clock failure does not partially accept scope, revision or audit', () => {
  const engine = createFixtureEngine({ workspaceId, clock: () => { throw new Error('secret clock text'); } });
  assert.throws(() => engine.command(owner, 'accept_scope', 0), isRefusal('internal_transition_failed'));
  const snapshot = engine.snapshotForTesting();
  assert.equal(snapshot.stage, 'draft'); assert.equal(snapshot.revision, 0); assert.equal(snapshot.scope, null); assert.equal(snapshot.audit.length, 0);
  assert.equal(snapshot.denied[0].reason, 'internal_transition_failed'); assert.equal(JSON.stringify(snapshot).includes('secret clock text'), false);
});

test('SQL transaction candidate remains invisible before adopt; rollback and competing candidates are safe', () => {
  const engine = create(); const candidate = engine.fork();
  candidate.command(owner, 'accept_scope', 0);
  assert.equal(engine.read(owner).revision, 0);
  const stale = engine.fork(); stale.command(owner, 'accept_scope', 0);
  engine.adopt(candidate); assert.equal(engine.read(owner).revision, 1);
  assert.throws(() => engine.adopt(stale), isRefusal('stale_or_unrelated_transaction'));
  assert.throws(() => engine.adopt(create()), isRefusal('stale_or_unrelated_transaction'));
  const discarded = engine.fork(); discarded.command(owner, 'submit_evidence', 1);
  assert.equal(engine.read(owner).stage, 'awaiting_evidence');
  const denied = engine.fork(); assert.throws(() => denied.command(owner, 'close', 1)); engine.adopt(denied);
  assert.equal(engine.read(owner).revision, 1); assert.equal(engine.read(owner).deniedCount, 1);
});

test('reviewed scope and command allowlist are immutable at runtime', () => {
  assert.ok(Object.isFrozen(COMMANDS));
  assert.throws(() => { (COMMANDS as unknown as string[]).push('send_report'); }, TypeError);
  assert.ok(Object.isFrozen(SCOPE)); assert.ok(Object.isFrozen(SCOPE.approvedOperations)); assert.ok(Object.isFrozen(SCOPE.excludedOperations));
  assert.throws(() => { (SCOPE.approvedOperations as unknown as string[])[0] = 'contact a real CRM'; }, TypeError);
  assert.throws(() => { (SCOPE as unknown as Record<string, unknown>).actionId = 'unapproved.action'; }, TypeError);
});
