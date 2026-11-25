import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerChatTools } from '../src/chat-tools.mjs';
import { withPilotAdmission } from '../src/pilot-access.mjs';
import { createChatStore } from '../../witnessops-academy-server/src/chat-store.mjs';
import { fixtureDb, OWNER_A, OWNER_B } from '../../witnessops-academy-server/test/chat-fixture.mjs';
import { httpFixture } from '../../witnessops-academy-server/test/chat-http-fixture.mjs';

async function connect(t, store, owner, admittedOwners) {
  const server = new McpServer({ name: 'academy-synthetic-acceptance', version: '1.0.0' });
  const ownerId = async auth => {
    assert.equal(auth?.extra?.iss, 'https://issuer.example.invalid');
    if (![OWNER_A, OWNER_B].includes(auth.extra.sub)) throw new Error('invalid_fixture_identity');
    return auth.extra.sub;
  };
  const admitted = handler => withPilotAdmission({ policy: 'approved-free-pilot', ownerId, db: { query: async (_sql, [id]) => ({ rows: [{ admitted: admittedOwners.has(id) }] }) } }, handler);
  registerChatTools(server, { store, admitted, ownerId, requiredScope: 'academy-mcp' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) => send(message, { ...options, authInfo: { extra: { iss: 'https://issuer.example.invalid', sub: owner } } });
  const client = new Client({ name: 'academy-synthetic-client', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  t.after(async () => { await client.close(); await server.close(); });
  return client;
}

test('real MCP SDK and website handler share assignments, evidence, revisions and owner-scoped decisions', async t => {
  const db = fixtureDb(), store = createChatStore(db), http = httpFixture(store);
  const grants = new Set([OWNER_A, OWNER_B]);
  const client = await connect(t, store, OWNER_A, grants);
  const other = await connect(t, store, OWNER_B, grants);
  const noAttempt = await client.callTool({ name: 'resume_lesson', arguments: { lesson_id: 'report-or-evidence' } });
  assert.equal(noAttempt.isError, true); assert.equal(noAttempt.structuredContent.error, 'no_attempt');
  const initial = (await http.request({ method: 'POST', body: { action: 'start', request_id: randomUUID() } })).body;
  const resumed = await client.callTool({ name: 'resume_lesson', arguments: { lesson_id: 'report-or-evidence' } });
  assert.equal(resumed.structuredContent.attempt_id, initial.attempt_id);
  assert.deepEqual(resumed.structuredContent.messages, initial.messages);
  const args = { lesson_id: initial.lesson_id, attempt_id: initial.attempt_id, expected_version: initial.version, request_id: randomUUID(), stage: initial.stage, choice_id: 'nothing' };
  const decision = await client.callTool({ name: 'submit_decision', arguments: args });
  assert.equal(decision.isError, undefined); assert.equal(decision.structuredContent.version, 2);
  assert.deepEqual((await http.request()).body, decision.structuredContent);
  assert.equal((await client.callTool({ name: 'submit_decision', arguments: args })).structuredContent.replay, true);
  const otherResume = await other.callTool({ name: 'resume_lesson', arguments: { lesson_id: initial.lesson_id } });
  assert.equal(otherResume.structuredContent.error, 'no_attempt');
  const forbidden = await client.callTool({ name: 'submit_decision', arguments: { ...args, owner_id: OWNER_B } });
  assert.equal(forbidden.isError, true);
  grants.delete(OWNER_A);
  const denied = await client.callTool({ name: 'inspect_evidence', arguments: { lesson_id: initial.lesson_id } });
  assert.deepEqual(denied.structuredContent, { error: 'access_required', status: 403 });
  assert.equal((await store.resume(OWNER_A, initial.lesson_id)).version, 2);
});

test('MCP advertises honest read/write annotations and OAuth for all five chat operations', async t => {
  const client = await connect(t, createChatStore(fixtureDb()), OWNER_A, new Set([OWNER_A]));
  const result = await client.listTools();
  assert.equal(result.tools.length, 5);
  for (const tool of result.tools) {
    assert.equal(tool.annotations.readOnlyHint, !['start_lesson', 'submit_decision'].includes(tool.name));
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.deepEqual(tool._meta.securitySchemes, [{ type: 'oauth2', scopes: ['academy-mcp'] }]);
  }
});
