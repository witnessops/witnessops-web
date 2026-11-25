import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_LESSONS, CHAT_LESSON_VERSION, CHAT_COACHING_THRESHOLD, MAX_CHAT_DECISIONS, createAttempt, presentAttempt, applyDecision, validateAttempt } from '../src/chat-engine.mjs';

const ID = 'a8098c1a-f86e-4a13-a1b2-c3d4e5f60708';
const fresh = (lessonId = 'report-or-evidence', seed = 'learner-one') => createAttempt({ lessonId, seed, attemptId: ID });
const decide = (state, choice_id) => applyDecision(state, { stage: presentAttempt(state).stage, choice_id });
const evidence = (state, name) => {
  const item = presentAttempt(state).messages.flatMap(message => message.evidence || []).find(item => item.name === name);
  return item ? JSON.parse(item.content) : null;
};
const find = (lessonId, predicate) => {
  for (let n = 0; n < 500; n++) {
    const state = fresh(lessonId, `learner-${n}`);
    if (predicate(state)) return state;
  }
  throw new Error(`No matching fixture: ${lessonId}`);
};
const pendingBackup = () => find('report-or-evidence', state => {
  const manifest = evidence(state, 'manifest.json');
  return manifest.restore_test === null && manifest.matches_expected_inventory && manifest.upload_checksum_verified;
});
const atFinal = (state, action = 'confirm_report') => decide(decide(state, 'nothing'), action);

test('both lesson objectives are available; unknown lessons cannot create attempts', () => {
  assert.deepEqual(CHAT_LESSONS.map(item => item.id), ['report-or-evidence', 'same-scope']);
  assert.ok(CHAT_LESSONS.every(item => item.title && item.objective));
  assert.throws(() => createAttempt({ lessonId: '../other' }), { code: 'unknown_lesson', status: 404 });
});

test('same seed reproduces evidence, order and feedback after serialized resume', () => {
  let state = fresh();
  assert.deepEqual(presentAttempt(state), presentAttempt(fresh()));
  state = decide(decide(state, 'nothing'), 'confirm_report');
  assert.deepEqual(presentAttempt(state), presentAttempt(JSON.parse(JSON.stringify(state))));
  assert.equal(state.lesson_version, CHAT_LESSON_VERSION);
});

test('learner scenarios materially vary backup evidence and supported initial conclusions', () => {
  const cases = new Set();
  const snapshots = new Set();
  const optionOrders = new Set();
  for (let n = 0; n < 80; n++) {
    const state = fresh('report-or-evidence', `variation-${n}`);
    const manifest = evidence(state, 'manifest.json');
    cases.add(!manifest.upload_checksum_verified ? 'failed-upload' : !manifest.matches_expected_inventory ? 'missing-files' : manifest.restore_test ? 'verified' : 'untested');
    snapshots.add(manifest.snapshot_id);
    optionOrders.add(presentAttempt(state).choices.map(item => item.id).join(','));
  }
  assert.deepEqual([...cases].sort(), ['failed-upload', 'missing-files', 'untested', 'verified']);
  assert.equal(snapshots.size, 80);
  assert.ok(optionOrders.size > 1);
});

test('Lesson 2 varies environment, revision, tenant and successful versus failed matching checks', () => {
  const cases = new Set();
  for (let n = 0; n < 80; n++) {
    const state = fresh('same-scope', `scope-${n}`);
    const request = evidence(state, 'requested-check.json');
    const result = evidence(state, 'check-record.json');
    const mismatch = ['environment', 'revision', 'tenant'].find(key => request[key] !== result[key]);
    cases.add(mismatch || result.result);
  }
  assert.deepEqual([...cases].sort(), ['environment', 'failed', 'passed', 'revision', 'tenant']);
});

test('the conversation path teaches excessive skepticism, confirmation and limited acceptance', () => {
  let state = pendingBackup();
  state = decide(state, 'nothing');
  assert.match(presentAttempt(state).messages.at(-1).text, /too restrictive/);
  state = decide(state, 'confirm_report');
  assert.match(presentAttempt(state).messages.at(-1).text, /New technical evidence: 0/);
  assert.equal(evidence(state, 'restore-test.json'), null);
  state = decide(state, 'require_restore');
  const result = presentAttempt(state);
  assert.equal(result.status, 'completed');
  assert.equal(result.stage, 'complete');
  assert.equal(result.coached, false);
  assert.equal(result.next_lesson_id, 'same-scope');
  assert.deepEqual(result.decision_record.find(item => item.claim === 'Recovery'), { claim: 'Recovery', status: 'UNVERIFIED' });
  assert.deepEqual(result.decision_record.find(item => item.claim === 'Task closure'), { claim: 'Task closure', status: 'BLOCKED' });
  assert.match(result.messages.at(-1).text, /no real infrastructure was tested/);
});

test('a simulated successful restore changes the supported final decision', () => {
  const state = find('report-or-evidence', candidate => {
    const initial = evidence(candidate, 'manifest.json');
    if (initial.restore_test || !initial.matches_expected_inventory || !initial.upload_checksum_verified) return false;
    return evidence(atFinal(candidate, 'controlled_restore'), 'restore-test.json')?.result === 'passed';
  });
  let current = atFinal(state, 'controlled_restore');
  const restored = evidence(current, 'restore-test.json');
  assert.equal(restored.matches_expected_inventory, true);
  assert.equal(restored.all_file_checksums_match, true);
  assert.equal(restored.restored_files, restored.expected_files);
  current = decide(current, 'require_restore');
  assert.equal(presentAttempt(current).stage, 'final');
  current = decide(current, 'accept_scope');
  assert.equal(presentAttempt(current).status, 'completed');
  assert.ok(presentAttempt(current).decision_record.some(item => item.claim === 'Recovery of this snapshot' && item.status === 'SUPPORTED'));
});

test('a simulated failed restore keeps closure blocked and requires remediation', () => {
  const state = find('report-or-evidence', candidate => {
    const initial = evidence(candidate, 'manifest.json');
    if (initial.restore_test || !initial.matches_expected_inventory || !initial.upload_checksum_verified) return false;
    return evidence(atFinal(candidate, 'controlled_restore'), 'restore-test.json')?.result === 'failed_content_mismatch';
  });
  let current = atFinal(state, 'controlled_restore');
  current = decide(current, 'accept_scope');
  assert.equal(presentAttempt(current).stage, 'final');
  current = decide(current, 'repair_restore');
  assert.equal(presentAttempt(current).status, 'completed');
  assert.ok(presentAttempt(current).decision_record.some(item => item.claim === 'Successful recovery' && item.status === 'CONTRADICTED'));
});

test('matching checksums cannot turn missing inventory into a complete backup', () => {
  const state = find('report-or-evidence', candidate => !evidence(candidate, 'manifest.json').matches_expected_inventory);
  const manifest = evidence(state, 'manifest.json');
  assert.equal(manifest.archive_checksum_verified, true);
  assert.ok(manifest.files < manifest.expected_inventory_files);
  let current = atFinal(state, 'controlled_restore');
  assert.equal(evidence(current, 'restore-test.json').result, 'failed_missing_required_files');
  current = decide(current, 'require_restore');
  assert.equal(presentAttempt(current).stage, 'final');
  assert.equal(presentAttempt(decide(current, 'repair_inventory')).status, 'completed');
});

test('failed upload does not erase archive creation or establish remote recovery', () => {
  const state = find('report-or-evidence', candidate => !evidence(candidate, 'manifest.json').upload_checksum_verified);
  let current = atFinal(state, 'controlled_restore');
  assert.equal(evidence(current, 'restore-test.json').result, 'not_run_no_uploaded_archive');
  current = decide(current, 'repair_upload');
  const record = presentAttempt(current).decision_record;
  assert.ok(record.some(item => item.claim === 'Archive created' && item.status === 'SUPPORTED'));
  assert.ok(record.some(item => item.claim === 'Upload completed' && item.status === 'CONTRADICTED'));
});

test('existing matching recovery proof remains useful even when confirmation adds nothing', () => {
  const state = find('report-or-evidence', candidate => evidence(candidate, 'manifest.json').restore_test !== null);
  const current = decide(atFinal(state), 'accept_scope');
  assert.equal(presentAttempt(current).status, 'completed');
});

test('repeating a wrong-scope check does not establish the requested production result', () => {
  const state = find('same-scope', candidate => evidence(candidate, 'check-record.json').environment === 'staging');
  let current = atFinal(state, 'repeat_same_check');
  assert.equal(evidence(current, 'repeated-check.json').environment, 'staging');
  current = decide(current, 'accept_scope');
  assert.equal(presentAttempt(current).stage, 'final');
  const result = presentAttempt(decide(current, 'require_matching_check'));
  assert.equal(result.status, 'completed');
  assert.ok(result.decision_record.some(item => item.claim === 'Requested production check' && item.status === 'UNVERIFIED'));
});

test('checking the requested scope yields both passing and failing scenarios with different decisions', () => {
  for (const expected of ['passed', 'failed']) {
    const state = find('same-scope', candidate => evidence(atFinal(candidate, 'check_requested_scope'), 'requested-scope-check.json').result === expected);
    const current = atFinal(state, 'check_requested_scope');
    const request = evidence(state, 'requested-check.json');
    const result = evidence(current, 'requested-scope-check.json');
    for (const key of ['environment', 'revision', 'tenant', 'check']) assert.equal(result[key], request[key]);
    const final = decide(current, expected === 'passed' ? 'accept_scope' : 'hold_failed');
    assert.equal(presentAttempt(final).status, 'completed');
    if (expected === 'passed') assert.ok(presentAttempt(final).decision_record.some(item => item.claim === 'Whole-system safety or release approval' && item.status === 'NOT ESTABLISHED'));
  }
});

test('a matching successful scope can be accepted without ritual repetition', () => {
  const state = find('same-scope', candidate => {
    const request = evidence(candidate, 'requested-check.json');
    const result = evidence(candidate, 'check-record.json');
    return result.result === 'passed' && ['environment', 'revision', 'tenant', 'check'].every(key => request[key] === result[key]);
  });
  assert.equal(presentAttempt(decide(atFinal(state), 'accept_scope')).status, 'completed');
});

test('public projection hides seed, future results and answer keys', () => {
  const state = pendingBackup();
  const projection = presentAttempt(state);
  assert.equal(projection.messages.length, 1);
  assert.equal(projection.decision_record, undefined);
  assert.equal(evidence(state, 'restore-test.json'), null);
  const serialized = JSON.stringify(projection);
  assert.ok(!serialized.includes(state.seed));
  for (const key of ['seed', 'profile', 'correct', 'followupPasses', 'decisions']) assert.equal(Object.hasOwn(projection, key), false);
  assert.equal(presentAttempt(fresh('same-scope')).messages.flatMap(message => message.evidence || []).length, 2);
});

test('decisions and projections cannot mutate the persisted input or another attempt', () => {
  const state = pendingBackup();
  const before = JSON.stringify(state);
  const next = decide(state, 'nothing');
  next.decisions[0].choice_id = 'accept_all';
  const projection = presentAttempt(state);
  projection.messages[0].evidence[0].content = 'tampered';
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(presentAttempt(state).messages[0].evidence[0].content, 'tampered');
  assert.equal(validateAttempt(state), true);
});

test('illegal stages, choices and extra authority fields fail closed', () => {
  const state = fresh();
  assert.throws(() => applyDecision(state, { stage: 'final', choice_id: 'accept_scope' }), { code: 'stage_conflict', status: 409 });
  assert.throws(() => applyDecision(state, { stage: 'judgment', choice_id: 'fabricated' }), { code: 'unknown_choice', status: 400 });
  assert.throws(() => applyDecision(state, { stage: 'judgment', choice_id: 'nothing', owner: 'another-learner' }), { code: 'invalid_decision' });
  assert.throws(() => applyDecision(state, { stage: 'judgment', choice_id: 'nothing', completed: true }), { code: 'invalid_decision' });
});

test('stored version mismatches, reordered history and extra fields are rejected', () => {
  const state = fresh();
  assert.equal(validateAttempt({ ...state, lesson_version: 'future-version' }), false);
  assert.equal(validateAttempt({ ...state, certified: true }), false);
  assert.equal(validateAttempt({ ...state, decisions: [{ stage: 'verification', choice_id: 'confirm_report' }] }), false);
  assert.equal(validateAttempt({ ...state, decisions: [{ stage: 'judgment', choice_id: 'nothing', passed: true }] }), false);
  assert.throws(() => presentAttempt({ ...state, lesson_version: 'future-version' }), { code: 'unsupported_lesson_version', status: 409 });
});

test('incorrect final decisions can be retried without advancing or awarding completion', () => {
  let current = atFinal(pendingBackup());
  current = decide(current, 'close_on_confidence');
  assert.equal(presentAttempt(current).stage, 'final');
  assert.equal(presentAttempt(current).status, 'in_progress');
  assert.equal(presentAttempt(current).decision_record, undefined);
  assert.equal(presentAttempt(decide(current, 'require_restore')).status, 'completed');
});

test('guided recovery preserves twelve decisions and offers one supported thirteenth decision', () => {
  let current = atFinal(pendingBackup());
  while (current.decisions.length < CHAT_COACHING_THRESHOLD) current = decide(current, 'close_on_confidence');
  const previousDecisions = structuredClone(current.decisions);
  const result = presentAttempt(current);
  assert.equal(result.stage, 'final');
  assert.equal(result.status, 'in_progress');
  assert.equal(result.coached, true);
  assert.deepEqual(result.choices.map(item => item.id), ['require_restore']);
  assert.equal(result.decision_record, undefined);
  assert.equal(result.next_lesson_id, undefined);
  assert.match(result.prompt, /Review the evidence with guidance/);
  assert.match(result.messages.at(-1).text, /coached practice, not an independent assessment or certification/);
  assert.throws(() => decide(current, 'close_on_confidence'), { code: 'unknown_choice', status: 400 });
  assert.equal(validateAttempt({ ...current, decisions: [...current.decisions, { stage: 'final', choice_id: 'close_on_confidence' }] }), false);
  const completed = decide(current, 'require_restore');
  assert.equal(completed.decisions.length, 13);
  assert.equal(completed.decisions.length, MAX_CHAT_DECISIONS);
  assert.deepEqual(completed.decisions.slice(0, CHAT_COACHING_THRESHOLD), previousDecisions);
  assert.deepEqual(current.decisions, previousDecisions);
  const final = presentAttempt(completed);
  assert.equal(final.status, 'completed');
  assert.equal(final.coached, true);
  assert.deepEqual(final.choices, []);
  assert.match(final.messages.at(-1).heading, /completed with coaching/);
  assert.match(final.messages.at(-1).text, /Completed with coaching/);
  assert.equal(final.messages.filter(message => message.heading === 'Review the evidence with guidance').length, 1);
  assert.deepEqual(final.messages.slice(0, result.messages.length), result.messages);
  assert.equal(validateAttempt({ ...completed, decisions: [...completed.decisions, { stage: 'final', choice_id: 'require_restore' }] }), false);
  assert.ok(Buffer.byteLength(JSON.stringify(current), 'utf8') < 32768);
  assert.ok(Buffer.byteLength(JSON.stringify(completed), 'utf8') < 32768);
  assert.throws(() => decide(completed, 'require_restore'), { code: 'attempt_finished', status: 409 });
});

test('a supported twelfth decision completes without being labelled guided recovery', () => {
  let current = atFinal(pendingBackup());
  while (current.decisions.length < CHAT_COACHING_THRESHOLD - 1) current = decide(current, 'close_on_confidence');
  const completed = decide(current, 'require_restore');
  assert.equal(completed.decisions.length, CHAT_COACHING_THRESHOLD);
  assert.equal(presentAttempt(completed).coached, false);
  assert.equal(presentAttempt(completed).status, 'completed');
  assert.doesNotMatch(presentAttempt(completed).messages.at(-1).heading, /with coaching/);
});

test('guided recovery selects the correct scope-specific boundary too', () => {
  const state = find('same-scope', candidate => evidence(candidate, 'check-record.json').environment === 'staging');
  let current = atFinal(state, 'repeat_same_check');
  while (current.decisions.length < CHAT_COACHING_THRESHOLD) current = decide(current, 'close_on_confidence');
  assert.deepEqual(presentAttempt(current).choices.map(item => item.id), ['require_matching_check']);
  assert.throws(() => decide(current, 'accept_scope'), { code: 'unknown_choice', status: 400 });
  const result = presentAttempt(decide(current, 'require_matching_check'));
  assert.equal(result.coached, true);
  assert.equal(result.status, 'completed');
  assert.ok(result.decision_record.some(item => item.claim === 'Requested production check' && item.status === 'UNVERIFIED'));
});

test('completion is immutable and cannot be appended with fabricated decisions', () => {
  const current = decide(atFinal(pendingBackup()), 'require_restore');
  assert.throws(() => applyDecision(current, { stage: 'final', choice_id: 'require_restore' }), { code: 'attempt_finished', status: 409 });
  assert.equal(validateAttempt({ ...current, decisions: [...current.decisions, { stage: 'final', choice_id: 'require_restore' }] }), false);
});

test('transport metadata remains separate from deterministic lesson state', () => {
  const result = presentAttempt(fresh(), { version: 7, updatedAt: new Date('2026-11-25T11:00:00Z') });
  assert.equal(result.version, 7);
  assert.equal(result.updated_at, '2026-11-25T11:00:00.000Z');
  assert.deepEqual(result.progress, { current: 1, total: 3 });
  assert.throws(() => presentAttempt(fresh(), { version: 0 }), { code: 'invalid_version' });
});
