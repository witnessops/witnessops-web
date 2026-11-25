import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_LESSON, LessonChatError, advanceLessonChat, parseLessonChatDecisions, projectLessonChat,
} from '../src/lesson-chat-engine.mjs';

const choose = (decisions, step_id, option_id) => advanceLessonChat(decisions, { step_id, option_id });
const atClosure = (verification = 'controlled_restore') => choose(
  choose([], 'judgment', 'created_recovery_unverified'), 'verification', verification,
);

test('one immutable fictional definition starts before teaching the conclusion', () => {
  assert.equal(CHAT_LESSON.revision, 'backup-review-v1');
  assert.throws(() => { CHAT_LESSON.evidence[0].content = 'changed'; }, TypeError);
  const state = projectLessonChat();
  assert.equal(state.version, 0);
  assert.equal(state.saved, false);
  assert.equal(state.updated_at, null);
  assert.equal(state.step_id, 'judgment');
  assert.equal(state.step_number, 1);
  assert.equal(state.total_steps, 3);
  assert.equal(state.completed, false);
  assert.equal(state.simulated, true);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].role, 'tutor');
  assert.match(state.messages[0].text, /Backup completed successfully/);
  assert.equal(state.options.length, 4);
  assert.equal(state.outcome, null);
  assert.equal(state.evidence[0].content, '09:00 Backup started\n09:04 Archive created\n09:05 Upload completed\n09:05 Exit code: 0');
  assert.deepEqual(JSON.parse(state.evidence[1].content), { files: 1842, checksum_verified: true, restore_test: null });
  state.evidence[0].content = 'a caller cannot mutate the source';
  assert.notEqual(projectLessonChat().evidence[0].content, state.evidence[0].content);
});

test('every initial judgment gets tailored feedback and retains supported facts', () => {
  const feedback = new Set();
  for (const option of projectLessonChat().options) {
    const state = projectLessonChat(choose([], 'judgment', option.id));
    assert.equal(state.step_id, 'verification');
    assert.equal(state.step_number, 2);
    assert.equal(state.options.length, 4);
    assert.equal(state.messages[1].role, 'learner');
    assert.equal(state.messages[1].text, option.label);
    feedback.add(state.messages[2].text);
    assert.match(state.messages[3].text, /creation and upload are supported/);
    assert.match(state.messages[3].text, /no independent checksum calculation/);
    assert.match(state.messages[3].text, /all required data is included remains unverified/);
    assert.equal(state.outcome, null);
  }
  assert.equal(feedback.size, 4);
  assert.match(projectLessonChat(choose([], 'judgment', 'nothing_established')).messages[2].text, /rejects more/);
  assert.match(projectLessonChat(choose([], 'judgment', 'backup_failed')).messages[2].text, /gap, not evidence/);
});

test('one verification choice is allowed and choosing a restore does not establish its execution', () => {
  for (const choice of ['ask_agent', 'controlled_restore', 'repeat_backup', 'recheck_exit_code']) {
    const decisions = atClosure(choice);
    const state = projectLessonChat(decisions);
    assert.equal(state.step_id, 'closure');
    assert.equal(state.step_number, 3);
    assert.equal(state.options.length, 3);
    assert.equal(state.evidence.length, 2);
    assert.match(state.messages.at(-1).text, /UNVERIFIED/);
    assert.throws(() => choose(decisions, 'verification', 'controlled_restore'), { code: 'step_conflict', status: 409 });
  }
  assert.match(projectLessonChat(atClosure('ask_agent')).messages.at(-1).text, /Additional claims: 1\. New technical evidence: 0\. Recovery tested: No/);
  assert.match(projectLessonChat(atClosure()).messages.at(-1).text, /simulation has not run it or supplied a restore result/);
});

test('wrong closure choices coach without completion and cannot be repeated', () => {
  let decisions = atClosure();
  decisions = choose(decisions, 'closure', 'accept_and_close');
  let state = projectLessonChat(decisions);
  assert.equal(state.completed, false);
  assert.equal(state.outcome, null);
  assert.equal(state.options.length, 2);
  assert.equal(state.options.some(option => option.id === 'accept_and_close'), false);
  assert.match(state.messages.at(-1).text, /proposed check does not establish its result/);
  assert.throws(() => choose(decisions, 'closure', 'accept_and_close'), { code: 'decision_already_submitted' });
  decisions = choose(decisions, 'closure', 'reject_everything');
  state = projectLessonChat(decisions);
  assert.equal(state.options.length, 1);
  assert.equal(state.completed, false);
  decisions = choose(decisions, 'closure', 'accept_supported_require_restore');
  assert.equal(decisions.length, 5);
  assert.equal(projectLessonChat(decisions).completed, true);
});

test('completion is the same after every proposed verification action', () => {
  for (const choice of ['ask_agent', 'controlled_restore', 'repeat_backup', 'recheck_exit_code']) {
    const decisions = choose(atClosure(choice), 'closure', 'accept_supported_require_restore');
    const state = projectLessonChat(decisions, { version: 3, updated_at: '2026-11-25T00:00:00.000Z', saved: true });
    assert.equal(state.step_id, 'complete');
    assert.equal(state.completed, true);
    assert.equal(state.step_number, 3);
    assert.equal(state.version, 3);
    assert.deepEqual(state.options, []);
    assert.deepEqual(state.outcome, {
      creation: 'SUPPORTED', recovery: 'UNVERIFIED', closure: 'BLOCKED',
      next_action: 'Controlled restore against the expected inventory.',
    });
    assert.match(state.messages.at(-1).text, /does not verify a real backup or award a qualification/);
    assert.throws(() => choose(decisions, 'closure', 'reject_everything'), { code: 'lesson_complete', status: 409 });
  }
});

test('saved decisions cannot inject status, skip steps, repeat choices or append after completion', () => {
  for (const value of [
    null, {}, [{ step_id: 'closure', option_id: 'accept_supported_require_restore' }],
    [{ step_id: 'judgment', option_id: 'created_recovery_unverified', completed: true }],
    [{ step_id: 'judgment', option_id: 'constructor' }],
    [...atClosure(), { step_id: 'closure', option_id: 'accept_and_close' }, { step_id: 'closure', option_id: 'accept_and_close' }],
    [...atClosure(), { step_id: 'closure', option_id: 'accept_supported_require_restore' }, { step_id: 'closure', option_id: 'reject_everything' }],
    Array.from({ length: 6 }, () => ({ step_id: 'judgment', option_id: 'backup_failed' })),
  ]) assert.equal(parseLessonChatDecisions(value), null);
  assert.deepEqual(parseLessonChatDecisions(atClosure()), atClosure());
  assert.throws(() => advanceLessonChat([], { step_id: 'judgment', option_id: 'backup_failed', outcome: {} }), LessonChatError);
  assert.throws(() => choose([], 'judgment', '<script>'), { code: 'invalid_option' });
});
