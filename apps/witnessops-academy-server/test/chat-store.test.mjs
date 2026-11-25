import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createChatStore, validateChatRequest } from '../src/chat-store.mjs';
import { fixtureDb, OWNER_A, OWNER_B } from './chat-fixture.mjs';

const LESSON = 'report-or-evidence';
const start = () => ({ action: 'start', request_id: randomUUID() });
const decision = (view, choice = view.choices[0].id) => ({ action: 'submit', attempt_id: view.attempt_id, expected_version: view.version, request_id: randomUUID(), stage: view.stage, choice_id: choice });

test('read-only resume creates nothing; concurrent starts keep one private assignment', async () => {
  const db = fixtureDb();
  const first = createChatStore(db), second = createChatStore(db);
  await assert.rejects(first.resume(OWNER_A, LESSON), { code: 'no_attempt', status: 404 });
  assert.equal(db.rows.size, 0);
  const [a, b] = await Promise.all([first.start(OWNER_A, LESSON, start()), second.start(OWNER_A, LESSON, start())]);
  assert.equal(a.attempt_id, b.attempt_id);
  assert.deepEqual(a.messages, b.messages);
  assert.equal(db.rows.size, 1);
  assert.equal(a.version, 1);
  assert.deepEqual((await second.start(OWNER_A, LESSON, start())).messages, a.messages);
});

test('two learners have separate scenarios and existing worksheet content is untouched', async () => {
  const db = fixtureDb();
  db.rows.set(`${OWNER_A}/${LESSON}`, { content: 'existing worksheet', version: 7 });
  const store = createChatStore(db);
  const a = await store.start(OWNER_A, LESSON, start());
  const b = await store.start(OWNER_B, LESSON, start());
  assert.notEqual(a.attempt_id, b.attempt_id);
  assert.notDeepEqual(a.messages[0].evidence, b.messages[0].evidence);
  assert.equal(db.rows.get(`${OWNER_A}/${LESSON}`).content, 'existing worksheet');
  await assert.rejects(store.submit(OWNER_B, LESSON, decision(a)), { code: 'attempt_conflict', status: 409 });
  const { resumed, ...savedA } = a;
  assert.deepEqual(await store.resume(OWNER_A, LESSON), savedA);
  assert.equal((await store.resume(OWNER_B, LESSON)).version, 1);
});

test('exact replay after a lost response or later decisions never advances twice', async () => {
  const db = fixtureDb();
  const store = createChatStore(db);
  const initial = await store.start(OWNER_A, LESSON, start());
  const request = decision(initial, 'nothing');
  const [a, b] = await Promise.all([store.submit(OWNER_A, LESSON, request), store.submit(OWNER_A, LESSON, request)]);
  assert.equal(a.version, 2); assert.equal(b.version, 2);
  const advanced = await store.submit(OWNER_A, LESSON, decision(a, 'confirm_report'));
  const replay = await store.submit(OWNER_A, LESSON, request);
  assert.equal(replay.replay, true); assert.equal(replay.version, advanced.version);
  assert.deepEqual(replay.messages, advanced.messages);
  await assert.rejects(store.submit(OWNER_A, LESSON, { ...request, choice_id: 'accept_all' }), { code: 'request_conflict', status: 409 });
});

test('simultaneous conflicting decisions cannot overwrite or skip a stage', async () => {
  const store = createChatStore(fixtureDb());
  const view = await store.start(OWNER_A, LESSON, start());
  const results = await Promise.allSettled([
    store.submit(OWNER_A, LESSON, decision(view, 'nothing')),
    store.submit(OWNER_A, LESSON, decision(view, 'accept_all')),
  ]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(results.find(item => item.status === 'rejected').reason.code, 'version_conflict');
  const current = await store.resume(OWNER_A, LESSON);
  assert.equal(current.stage, 'verification'); assert.equal(current.version, 2);
  await assert.rejects(store.submit(OWNER_A, LESSON, { ...decision(current), stage: 'final' }), { code: 'stage_conflict', status: 409 });
  await assert.rejects(store.submit(OWNER_A, LESSON, decision(current, 'invented')), { code: 'unknown_choice' });
});

test('unknown saved formats, tampering and version drift remain unchanged', async () => {
  for (const mutate of [row => { row.content = 'old format'; }, row => { row.version += 1; }, row => {
    const value = JSON.parse(row.content); value.attempt.seed = 'not a valid seed'; row.content = JSON.stringify(value);
  }]) {
    const db = fixtureDb(); const store = createChatStore(db);
    await store.start(OWNER_A, LESSON, start());
    mutate(db.rows.get(`${OWNER_A}/chat-${LESSON}`));
    const before = structuredClone([...db.rows]);
    await assert.rejects(store.start(OWNER_A, LESSON, start()), { code: 'saved_lesson_unavailable', status: 409 });
    assert.deepEqual([...db.rows], before);
  }
});

test('strict requests reject forged ownership, seeds, extra fields and coercible IDs', () => {
  for (const body of [null, [], { ...start(), owner_id: OWNER_B }, { ...start(), seed: 'easy' }, { ...start(), request_id: [randomUUID()] }, { ...start(), action: 'reset' }]) {
    assert.throws(() => validateChatRequest(body));
  }
});

test('progress is owner-scoped and read-only, and resuming reconstructs with a fresh store', async () => {
  const db = fixtureDb(); const store = createChatStore(db);
  const initial = await store.start(OWNER_A, LESSON, start());
  const saved = await store.submit(OWNER_A, LESSON, decision(initial, 'nothing'));
  const before = structuredClone([...db.rows]);
  assert.deepEqual(await createChatStore(db).resume(OWNER_A, LESSON), saved);
  assert.equal((await store.progress(OWNER_B)).lessons.every(item => item.status === 'not_started'), true);
  assert.equal((await store.progress(OWNER_A)).lessons[0].version, 2);
  assert.deepEqual([...db.rows], before);
});

test('the thirteenth coached decision can be saved without losing prior decisions or replay receipts', async () => {
  const db = fixtureDb(), store = createChatStore(db);
  let view = await store.start(OWNER_A, LESSON, start());
  view = await store.submit(OWNER_A, LESSON, decision(view, 'nothing'));
  view = await store.submit(OWNER_A, LESSON, decision(view, 'confirm_report'));
  for (let n = 0; n < 10; n++) view = await store.submit(OWNER_A, LESSON, decision(view, 'close_on_confidence'));
  assert.equal(view.coached, true); assert.equal(view.choices.length, 1);
  const priorMessages = structuredClone(view.messages);
  const finalRequest = decision(view);
  const completed = await store.submit(OWNER_A, LESSON, finalRequest);
  assert.equal(completed.status, 'completed'); assert.equal(completed.coached, true);
  assert.deepEqual(completed.messages.slice(0, priorMessages.length), priorMessages);
  const stored = JSON.parse(db.rows.get(`${OWNER_A}/chat-${LESSON}`).content);
  assert.equal(stored.attempt.decisions.length, 13); assert.equal(stored.requests.length, 13);
  assert.equal((await createChatStore(db).resume(OWNER_A, LESSON)).status, 'completed');
  assert.equal((await store.submit(OWNER_A, LESSON, finalRequest)).replay, true);
});
