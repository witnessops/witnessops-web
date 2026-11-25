import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createChatStore } from '../src/chat-store.mjs';
import { chatLessonFromPath } from '../src/chat-http.mjs';
import { fixtureDb, OWNER_A, OWNER_B } from './chat-fixture.mjs';
import { httpFixture } from './chat-http-fixture.mjs';

test('chat route is an exact two-lesson allowlist', () => {
  assert.equal(chatLessonFromPath('/academy/api/lessons/report-or-evidence/chat'), 'report-or-evidence');
  assert.equal(chatLessonFromPath('/academy/api/lessons/same-scope/chat'), 'same-scope');
  for (const path of ['/academy/api/lessons/private/chat', '/academy/api/lessons/report-or-evidence/chat/owner', '/academy/api/lessons/chat-report-or-evidence/draft']) assert.equal(chatLessonFromPath(path), null);
});

test('HTTP requires session, active admission and CSRF before creating or changing a scenario', async () => {
  const db = fixtureDb(), http = httpFixture(createChatStore(db));
  const body = { action: 'start', request_id: randomUUID() };
  assert.equal((await http.request({ method: 'POST', owner: 'missing', body })).status, 401);
  http.admitted.delete(OWNER_A);
  assert.equal((await http.request({ method: 'POST', body })).status, 403);
  http.admitted.add(OWNER_A);
  for (const headers of [{ origin: 'https://outside.invalid' }, { 'x-csrf-token': 'wrong' }]) assert.equal((await http.request({ method: 'POST', body, headers })).status, 403);
  assert.equal(db.rows.size, 0);
  const started = await http.request({ method: 'POST', body });
  assert.equal(started.status, 200);
  http.admitted.delete(OWNER_A);
  assert.equal((await http.request()).status, 403);
  assert.equal(db.rows.size, 1);
});

test('HTTP validates JSON, body size, method, exact fields and IDs', async () => {
  const http = httpFixture(createChatStore(fixtureDb()));
  const body = { action: 'start', request_id: randomUUID() };
  assert.equal((await http.request({ method: 'POST', body, headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await http.request({ method: 'POST', raw: '{bad' })).status, 400);
  assert.equal((await http.request({ method: 'POST', raw: ' '.repeat(4097) })).status, 413);
  assert.equal((await http.request({ method: 'DELETE' })).status, 405);
  assert.equal((await http.request({ method: 'POST', body: { ...body, owner_id: OWNER_B } })).status, 400);
  assert.equal((await http.request({ method: 'POST', body: { ...body, request_id: [body.request_id] } })).status, 400);
});

test('HTTP only saves the submitted step, exposes no private seed and isolates readers', async () => {
  const db = fixtureDb(), http = httpFixture(createChatStore(db));
  assert.equal((await http.request()).status, 404);
  const view = (await http.request({ method: 'POST', body: { action: 'start', request_id: randomUUID() } })).body;
  assert.equal('seed' in view, false); assert.equal('correct' in view, false);
  assert.equal((await http.request({ owner: OWNER_B })).status, 404);
  const request = { action: 'submit', request_id: randomUUID(), expected_version: view.version, attempt_id: view.attempt_id, stage: view.stage, choice_id: 'nothing' };
  const saved = await http.request({ method: 'POST', body: request });
  assert.equal(saved.status, 200); assert.equal(saved.body.stage, 'verification');
  assert.equal((await http.request({ method: 'POST', body: request })).body.replay, true);
  const before = structuredClone([...db.rows]);
  await http.request();
  assert.deepEqual([...db.rows], before);
});

test('storage failures have generic responses and cannot falsely acknowledge a save', async () => {
  const store = createChatStore({ query: async () => { throw new Error('private_database_detail'); } });
  const result = await httpFixture(store).request();
  assert.deepEqual(result, { status: 503, body: { error: 'lesson_unavailable' }, headers: {} });
});
