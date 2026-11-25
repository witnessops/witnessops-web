import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { LESSON_CHAT_ID, LESSON_CHAT_STORAGE_KEY } from '../src/lesson-chat-engine.mjs';
import { readLessonChat, submitLessonDecision } from '../src/lesson-chat-store.mjs';
import { createLessonChatMemoryPool } from './lesson-chat-db-fixture.mjs';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const request = (step_id = 'judgment', option_id = 'created_recovery_unverified', expected_version = 0) => ({
  lesson_id: LESSON_CHAT_ID, step_id, option_id, expected_version, request_id: randomUUID(),
});

test('initial read is private, read-only, and leaves an existing worksheet untouched', async () => {
  const db = createLessonChatMemoryPool();
  const legacy = { content: 'Original learner worksheet', version: 7, last_save_request_id: randomUUID(), updated_at: new Date() };
  db.seed(A, LESSON_CHAT_ID, legacy);
  const initial = await readLessonChat(db, A);
  assert.equal(initial.status, 200);
  assert.equal(initial.body.version, 0);
  assert.equal(initial.body.saved, false);
  assert.equal(db.writes, 0);
  assert.equal(db.get(A, LESSON_CHAT_STORAGE_KEY), undefined);
  await submitLessonDecision(db, A, request());
  assert.deepEqual(db.get(A, LESSON_CHAT_ID), legacy);
  assert.equal((await readLessonChat(db, B)).body.version, 0);
  assert.equal((await readLessonChat(db, A)).body.version, 1);
});

test('shared store resumes every step and keeps another learner isolated', async () => {
  const db = createLessonChatMemoryPool();
  let result = await submitLessonDecision(db, A, request());
  assert.equal(result.body.step_id, 'verification');
  assert.deepEqual((await readLessonChat(db, A)).body, result.body);
  result = await submitLessonDecision(db, A, request('verification', 'ask_agent', result.body.version));
  assert.equal(result.body.step_id, 'closure');
  result = await submitLessonDecision(db, A, request('closure', 'accept_supported_require_restore', result.body.version));
  assert.equal(result.status, 200);
  assert.equal(result.body.completed, true);
  assert.equal(result.body.version, 3);
  assert.deepEqual((await readLessonChat(db, A)).body, result.body);
  assert.equal((await readLessonChat(db, B)).body.version, 0);
  assert.equal(result.body.lesson_id, LESSON_CHAT_ID);
  assert.equal(JSON.stringify(result.body).includes(A), false);
});

test('uncertain-response retry advances exactly once and same UUID with changed body is rejected', async () => {
  const db = createLessonChatMemoryPool();
  const first = request();
  const committed = await submitLessonDecision(db, A, first);
  assert.deepEqual(await submitLessonDecision(db, A, { ...first }), committed);
  assert.equal(db.writes, 1);
  const changed = await submitLessonDecision(db, A, { ...first, option_id: 'backup_failed' });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.error, 'request_id_conflict');
  assert.equal(db.writes, 1);
  await submitLessonDecision(db, A, request('verification', 'controlled_restore', 1));
  const late = await submitLessonDecision(db, A, first);
  assert.equal(late.status, 409);
  assert.equal(late.body.error, 'version_conflict');
  const reused = await submitLessonDecision(db, A, {
    ...first, step_id: 'closure', option_id: 'accept_supported_require_restore', expected_version: 2,
  });
  assert.equal(reused.status, 409);
  assert.equal(reused.body.error, 'request_id_conflict');
  assert.equal(db.writes, 2);
});

test('simultaneous first writes and stale follow-ups cannot overwrite the winner', async () => {
  const db = createLessonChatMemoryPool();
  const results = await Promise.all([
    submitLessonDecision(db, A, request()),
    submitLessonDecision(db, A, request('judgment', 'backup_failed')),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(db.writes, 1);
  const original = db.get(A, LESSON_CHAT_STORAGE_KEY);
  const conflict = await submitLessonDecision(db, A, request('verification', 'ask_agent', 0));
  assert.equal(conflict.body.error, 'version_conflict');
  assert.deepEqual(db.get(A, LESSON_CHAT_STORAGE_KEY), original);
  const updates = await Promise.all([
    submitLessonDecision(db, A, request('verification', 'ask_agent', 1)),
    submitLessonDecision(db, A, request('verification', 'controlled_restore', 1)),
  ]);
  assert.deepEqual(updates.map(result => result.status).sort(), [200, 409]);
  assert.equal(db.writes, 2);
});

test('simultaneous identical requests return one committed projection', async () => {
  const db = createLessonChatMemoryPool();
  const first = request();
  const [a, b] = await Promise.all([submitLessonDecision(db, A, first), submitLessonDecision(db, A, { ...first })]);
  assert.equal(a.status, 200);
  assert.deepEqual(a, b);
  assert.equal(db.writes, 1);
});

test('owner fields, fabricated outcomes and bad versions are rejected before writes', async () => {
  const db = createLessonChatMemoryPool();
  for (const input of [
    null, [], {}, { ...request(), owner_id: B }, { ...request(), sub: 'forged' },
    { ...request(), completed: true }, { ...request(), outcome: { recovery: 'VERIFIED' } },
    { ...request(), expected_version: -1 }, { ...request(), expected_version: 1.5 },
    { ...request(), request_id: 'not-a-uuid' }, { ...request(), step_id: 'complete' },
  ]) assert.equal((await submitLessonDecision(db, A, input)).status, 400);
  assert.equal((await readLessonChat(db, A, '../arbitrary')).status, 404);
  assert.equal((await submitLessonDecision(db, A, { ...request(), lesson_id: LESSON_CHAT_STORAGE_KEY })).status, 404);
  assert.equal((await submitLessonDecision(db, undefined, request())).status, 401);
  assert.equal(db.writes, 0);
});

test('unknown or corrupt progress is retained and never silently replaced', async () => {
  const db = createLessonChatMemoryPool();
  const unknown = { content: 'private unknown saved text', version: 1, last_save_request_id: randomUUID(), updated_at: new Date() };
  db.seed(A, LESSON_CHAT_STORAGE_KEY, unknown);
  assert.equal((await readLessonChat(db, A)).body.error, 'saved_progress_unrecognized');
  assert.equal((await submitLessonDecision(db, A, request())).body.error, 'saved_progress_unrecognized');
  assert.deepEqual(db.get(A, LESSON_CHAT_STORAGE_KEY), unknown);
  assert.equal(db.writes, 0);
  const clean = createLessonChatMemoryPool();
  await submitLessonDecision(clean, A, request());
  const row = clean.get(A, LESSON_CHAT_STORAGE_KEY);
  for (const mutate of [
    value => { value.completed = true; },
    value => { value.last_request.option_id = 'backup_failed'; },
    value => { value.last_request.expected_version = 5; },
    value => { value.revision = 'future-revision'; },
    value => { value.requests[0].option_id = 'backup_failed'; },
    value => { value.requests = []; },
    value => { value.decisions.push({ step_id: 'closure', option_id: 'accept_supported_require_restore' }); },
  ]) {
    const value = JSON.parse(row.content);
    mutate(value);
    const corrupt = { ...row, content: JSON.stringify(value) };
    db.seed(A, LESSON_CHAT_STORAGE_KEY, corrupt);
    assert.equal((await readLessonChat(db, A)).body.error, 'saved_progress_unrecognized');
    assert.equal((await submitLessonDecision(db, A, request('verification', 'ask_agent', 1))).status, 409);
    assert.deepEqual(db.get(A, LESSON_CHAT_STORAGE_KEY), corrupt);
  }
  assert.equal(db.writes, 0);
});

test('step conflicts, duplicate closure decisions and completed lessons do not mutate progress', async () => {
  const db = createLessonChatMemoryPool();
  assert.equal((await submitLessonDecision(db, A, request('closure', 'accept_supported_require_restore'))).body.error, 'step_conflict');
  assert.equal((await submitLessonDecision(db, A, request('judgment', 'forged_option'))).body.error, 'invalid_option');
  await submitLessonDecision(db, A, request());
  await submitLessonDecision(db, A, request('verification', 'controlled_restore', 1));
  await submitLessonDecision(db, A, request('closure', 'accept_and_close', 2));
  assert.equal((await submitLessonDecision(db, A, request('closure', 'accept_and_close', 3))).body.error, 'decision_already_submitted');
  const complete = await submitLessonDecision(db, A, request('closure', 'accept_supported_require_restore', 3));
  assert.equal(complete.body.version, 4);
  assert.equal(complete.body.outcome.recovery, 'UNVERIFIED');
  assert.equal(complete.body.outcome.closure, 'BLOCKED');
  assert.equal((await submitLessonDecision(db, A, request('closure', 'reject_everything', 4))).body.error, 'lesson_complete');
  assert.equal(db.writes, 4);
});
