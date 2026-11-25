import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { lessonChatMetadata, registerLessonChatTools } from '../src/lesson-chat-tools.mjs';
import { CHAT_TOOL_NAMES } from '../src/tools.mjs';
import { CHAT_LESSON, LESSON_CHAT_STORAGE_KEY } from '../../witnessops-academy-server/src/lesson-chat-engine.mjs';
import { readLessonChat, submitLessonDecision } from '../../witnessops-academy-server/src/lesson-chat-store.mjs';
import { createLessonChatMemoryPool } from '../../witnessops-academy-server/test/lesson-chat-db-fixture.mjs';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const REQUESTS = [1, 2, 3, 4].map(value => `10000000-0000-4000-8000-${String(value).padStart(12, '0')}`);
const lesson = { lesson_id: 'report-or-evidence' };
const request = (step_id, option_id, expected_version, request_id = REQUESTS[expected_version]) => ({
  ...lesson, step_id, option_id, expected_version, request_id,
});
const initialDecision = () => request('judgment', 'created_recovery_unverified', 0);

// This fixture exercises the real MCP handlers and the shared state/store. It
// is deliberately not evidence of a live OAuth session or a PostgreSQL server.
function harness() {
  const memory = createLessonChatMemoryPool();
  const admission = new Map([[A, true], [B, true]]);
  let unavailable = false;
  let progressCalls = 0;
  let grantCalls = 0;
  const db = { query: async (sql, values) => {
    if (sql.includes('academy_has_approved_free_grant')) {
      grantCalls += 1;
      if (unavailable) throw new Error('synthetic private database detail');
      return { rowCount: 1, rows: [{ admitted: admission.get(values[0]) === true }] };
    }
    progressCalls += 1;
    return memory.query(sql, values);
  } };
  const handlers = new Map();
  const configs = new Map();
  registerLessonChatTools({ registerTool(name, config, handler) {
    assert.equal(handlers.has(name), false);
    handlers.set(name, handler); configs.set(name, config);
  } }, { db, policy: 'approved-free-pilot', ownerId: async auth => auth.extra.validatedOwner });
  return {
    db, memory, admission, handlers, configs,
    call: (name, args = lesson, owner = A) => handlers.get(name)(args, { authInfo: { extra: { validatedOwner: owner } } }),
    unavailable: value => { unavailable = value; },
    counts: () => ({ progressCalls, grantCalls }),
  };
}

test('discovery points to one shared practice revision without exposing its storage key', () => {
  const metadata = lessonChatMetadata(CHAT_LESSON.id);
  assert.equal(metadata.revision, CHAT_LESSON.revision);
  assert.equal(metadata.start_tool, 'start_lesson');
  assert.equal(metadata.shared_progress, true);
  assert.equal(metadata.simulated, true);
  assert.equal(JSON.stringify(metadata).includes(LESSON_CHAT_STORAGE_KEY), false);
  assert.equal(lessonChatMetadata('same-scope'), null);
});

test('all chat reads return the website projection and do not create or reset progress', async () => {
  const h = harness();
  assert.deepEqual([...h.handlers.keys()], CHAT_TOOL_NAMES);
  const expected = (await readLessonChat(h.db, A)).body;
  for (const name of CHAT_TOOL_NAMES.filter(name => name !== 'submit_decision')) {
    const response = await h.call(name);
    assert.deepEqual(response.structuredContent, expected);
    assert.deepEqual(JSON.parse(response.content[0].text), expected);
    assert.equal(response.isError, undefined);
    assert.equal(response.structuredContent.version, 0);
    assert.equal(response.structuredContent.outcome, null);
    assert.equal(response.structuredContent.messages.length, 1, 'future coaching is not revealed');
    assert.equal(response.structuredContent.evidence.length, 2);
  }
  assert.equal((await h.db.query('SELECT content, version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2', [A, LESSON_CHAT_STORAGE_KEY])).rows.length, 0);
});

test('website to MCP to website resumes one private progress row and preserves worksheet work', async () => {
  const h = harness();
  await h.db.query('INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, version, last_save_request_id) VALUES ($1,$2,$3,1,$4) ON CONFLICT (owner_id, lesson_id) DO NOTHING RETURNING version, updated_at', [A, lesson.lesson_id, 'Original synthetic worksheet answer.', REQUESTS[3]]);
  const website = await submitLessonDecision(h.db, A, initialDecision());
  assert.equal(website.status, 200);
  assert.deepEqual((await h.call('resume_lesson')).structuredContent, website.body);
  const decision = request('verification', 'ask_agent', 1);
  const mcp = await h.call('submit_decision', decision);
  assert.equal(mcp.structuredContent.step_id, 'closure');
  assert.match(mcp.structuredContent.messages.at(-1).text, /New technical evidence: 0/);
  assert.deepEqual((await readLessonChat(h.db, A)).body, mcp.structuredContent);
  const finished = await submitLessonDecision(h.db, A, request('closure', 'accept_supported_require_restore', 2));
  assert.equal(finished.status, 200);
  assert.equal(finished.body.completed, true);
  assert.equal(finished.body.outcome.recovery, 'UNVERIFIED');
  assert.equal(finished.body.outcome.closure, 'BLOCKED');
  assert.deepEqual((await h.call('get_progress')).structuredContent, finished.body);
  assert.deepEqual((await h.call('start_lesson')).structuredContent, finished.body, 'start does not reset completed work');
  const old = (await h.db.query('SELECT content, version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2', [A, lesson.lesson_id])).rows[0];
  assert.equal(old.content, 'Original synthetic worksheet answer.');
  assert.equal(old.version, 1);
});

test('lost-response retry advances once and a changed request UUID payload cannot overwrite it', async () => {
  const h = harness();
  const original = initialDecision();
  const first = await h.call('submit_decision', original);
  assert.equal(first.structuredContent.version, 1);
  assert.deepEqual(await h.call('submit_decision', original), first);
  const reused = await h.call('submit_decision', { ...original, option_id: 'nothing_established' });
  assert.equal(reused.isError, true);
  assert.equal(reused.structuredContent.status, 409);
  assert.equal(reused.structuredContent.error, 'request_id_conflict');
  const stale = await h.call('submit_decision', { ...original, request_id: REQUESTS[3] });
  assert.equal(stale.isError, true);
  assert.equal(stale.structuredContent.status, 409);
  assert.deepEqual((await h.call('resume_lesson')).structuredContent, first.structuredContent);
});

test('two authenticated learners remain separate and forbidden fields never reach progress storage', async () => {
  const h = harness();
  const savedA = await h.call('submit_decision', initialDecision());
  const freshB = await h.call('resume_lesson', lesson, B);
  assert.equal(freshB.structuredContent.version, 0);
  assert.equal(freshB.structuredContent.messages.length, 1);
  const before = h.counts().progressCalls;
  for (const name of CHAT_TOOL_NAMES) {
    const args = name === 'submit_decision' ? initialDecision() : lesson;
    const denied = await h.call(name, { ...args, owner_id: A }, B);
    assert.equal(denied.isError, true);
    assert.deepEqual(denied.structuredContent, { error: 'invalid_fields', status: 400 });
  }
  assert.equal(h.counts().progressCalls, before);
  assert.deepEqual((await h.call('get_progress')).structuredContent, savedA.structuredContent);
});

test('revocation and unavailable admission deny all five registered tools on an existing session', async () => {
  const h = harness();
  const saved = await h.call('submit_decision', initialDecision());
  const before = h.counts().progressCalls;
  h.admission.set(A, false);
  for (const name of CHAT_TOOL_NAMES) {
    const args = name === 'submit_decision' ? request('verification', 'controlled_restore', 1) : lesson;
    const denied = await h.call(name, args);
    assert.equal(denied.isError, true);
    assert.deepEqual(denied.structuredContent, { error: 'access_required', status: 403 });
  }
  assert.equal(h.counts().progressCalls, before);
  h.admission.set(A, true); h.unavailable(true);
  for (const name of CHAT_TOOL_NAMES) {
    const denied = await h.call(name, name === 'submit_decision' ? initialDecision() : lesson);
    assert.deepEqual(denied.structuredContent, { error: 'access_unavailable', status: 503 });
    assert.equal(JSON.stringify(denied).includes('synthetic private'), false);
  }
  assert.equal(h.counts().progressCalls, before);
  h.unavailable(false);
  assert.deepEqual((await h.call('resume_lesson')).structuredContent, saved.structuredContent);
});

test('a progress database error is private and never returned as successful empty progress', async () => {
  const handlers = new Map();
  registerLessonChatTools({ registerTool(name, _config, handler) { handlers.set(name, handler); } }, {
    db: { query: async sql => {
      if (sql.includes('academy_has_approved_free_grant')) return { rows: [{ admitted: true }] };
      throw new Error('synthetic private connection detail');
    } }, policy: 'approved-free-pilot', ownerId: async () => A,
  });
  for (const name of CHAT_TOOL_NAMES) {
    const response = await handlers.get(name)(name === 'submit_decision' ? initialDecision() : lesson, { authInfo: {} });
    assert.equal(response.isError, true);
    assert.deepEqual(response.structuredContent, { error: 'progress_unavailable', status: 503 });
    assert.equal(JSON.stringify(response).includes('synthetic private'), false);
  }
});

test('the installed MCP SDK advertises strict schemas and carries practice results and conflicts', async () => {
  const h = harness();
  const server = new McpServer({ name: 'academy-chat-contract-test', version: '0.0.0' });
  // The transport fixture isolates SDK framing/schema behavior, not OAuth.
  registerLessonChatTools(server, { db: h.db, policy: 'approved-free-pilot', ownerId: async () => A });
  const client = new Client({ name: 'synthetic-practice-learner', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name), CHAT_TOOL_NAMES);
    assert.equal(listed.tools.every(tool => tool.inputSchema.additionalProperties === false), true);
    const opened = await client.callTool({ name: 'start_lesson', arguments: lesson });
    assert.equal(opened.structuredContent.version, 0);
    const forged = await client.callTool({ name: 'submit_decision', arguments: { ...initialDecision(), owner_id: B } });
    assert.equal(forged.isError, true);
    assert.equal(h.memory.writes, 0);
    const accepted = await client.callTool({ name: 'submit_decision', arguments: initialDecision() });
    assert.equal(accepted.structuredContent.version, 1);
    assert.deepEqual(JSON.parse(accepted.content[0].text), accepted.structuredContent);
    const conflict = await client.callTool({ name: 'submit_decision', arguments: { ...initialDecision(), request_id: REQUESTS[3] } });
    assert.equal(conflict.isError, true);
    assert.equal(conflict.structuredContent.status, 409);
    h.admission.set(A, false);
    const revoked = await client.callTool({ name: 'resume_lesson', arguments: lesson });
    assert.equal(revoked.isError, true);
    assert.equal(revoked.structuredContent.status, 403);
  } finally {
    await client.close();
    await server.close();
  }
});
