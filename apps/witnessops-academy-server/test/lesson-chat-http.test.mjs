import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createLessonChatHttpFixture, CHAT_TEST_LEARNERS } from './lesson-chat-http-fixture.mjs';
import { CHAT_API, CHAT_DECISION_API, CHAT_ROUTE } from '../src/lesson-chat-routes.mjs';

const choice = () => ({ lesson_id: 'report-or-evidence', step_id: 'judgment', option_id: 'created_recovery_unverified', expected_version: 0, request_id: crypto.randomUUID() });
test('real HTTP handler enforces session, methods, admission, Origin, CSRF and exact bodies', async () => {
  const fixture = await createLessonChatHttpFixture();
  const request = (path, options) => fetch(fixture.origin + path, options);
  const post = (body, headers = fixture.headers('a')) => request(CHAT_DECISION_API, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  try {
    const shell = await request(CHAT_ROUTE);
    assert.equal(shell.status, 200);
    assert.match(await shell.text(), /Sign in to start/);
    assert.equal(shell.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(shell.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
    assert.equal((await request(CHAT_API)).status, 401);
    assert.equal((await request(CHAT_DECISION_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(choice()) })).status, 401);
    for (const [path, method, allow] of [[CHAT_ROUTE, 'POST', 'GET, HEAD'], [CHAT_API, 'PUT', 'GET'], [CHAT_DECISION_API, 'GET', 'POST']]) {
      const result = await request(path, { method }); assert.equal(result.status, 405); assert.equal(result.headers.get('allow'), allow);
    }
    assert.equal((await request(CHAT_ROUTE, { method: 'HEAD' })).status, 200);
    assert.equal((await request(CHAT_ROUTE + '/')).status, 404);
    for (const headers of [
      { ...fixture.headers('a'), Origin: 'https://elsewhere.example.invalid' },
      { ...fixture.headers('a'), Origin: '' },
      { ...fixture.headers('a'), 'X-CSRF-Token': 'wrong' },
      { ...fixture.headers('a'), 'Sec-Fetch-Site': 'cross-site' },
    ]) assert.equal((await post(choice(), headers)).status, 403);
    assert.equal((await post(choice(), { ...fixture.headers('a'), 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post('{')).status, 400);
    assert.equal((await post('x'.repeat(2049))).status, 413);
    assert.equal((await post({ ...choice(), owner_id: CHAT_TEST_LEARNERS.b })).status, 400);
    assert.equal((await post({ ...choice(), lesson_id: '../other' })).status, 404);
    assert.equal(fixture.memory.writes, 0);
    fixture.admission.set(CHAT_TEST_LEARNERS.a, false);
    assert.equal((await request(CHAT_API, { headers: fixture.headers('a') })).status, 403);
    assert.equal((await post(choice())).status, 403);
    assert.equal((await request(CHAT_ROUTE, { headers: fixture.headers('a') })).status, 403);
    assert.equal(fixture.memory.writes, 0);
  } finally { await fixture.close(); }
});

test('HTTP and actual MCP adapter resume one owner-scoped record without replacing worksheet work', async () => {
  const fixture = await createLessonChatHttpFixture();
  try {
    fixture.memory.seed(CHAT_TEST_LEARNERS.a, 'report-or-evidence', { content: 'Synthetic existing worksheet answer.', version: 3 });
    const first = choice();
    const result = await fetch(fixture.origin + CHAT_DECISION_API, { method: 'POST', headers: fixture.headers('a'), body: JSON.stringify(first) });
    assert.equal(result.status, 200);
    const saved = await result.json();
    assert.equal(saved.version, 1);
    assert.deepEqual((await fixture.mcpCall('resume_lesson', { lesson_id: 'report-or-evidence' })).structuredContent, saved);
    const mcp = await fixture.mcpCall('submit_decision', { lesson_id: 'report-or-evidence', step_id: 'verification', option_id: 'ask_agent', expected_version: 1, request_id: crypto.randomUUID() });
    assert.equal(mcp.structuredContent.step_id, 'closure');
    const reloaded = await fetch(fixture.origin + CHAT_API, { headers: fixture.headers('a') });
    assert.deepEqual(await reloaded.json(), mcp.structuredContent);
    const other = await fetch(fixture.origin + CHAT_API + '?owner_id=' + CHAT_TEST_LEARNERS.a, { headers: fixture.headers('b') });
    assert.equal((await other.json()).version, 0);
    assert.equal(fixture.memory.get(CHAT_TEST_LEARNERS.a, 'report-or-evidence').content, 'Synthetic existing worksheet answer.');
    assert.equal(fixture.memory.get(CHAT_TEST_LEARNERS.a, 'report-or-evidence').version, 3);
  } finally { await fixture.close(); }
});
