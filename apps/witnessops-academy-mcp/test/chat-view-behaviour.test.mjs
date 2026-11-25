import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bootView, flush } from './support/view-dom.mjs';

const html = readFileSync(new URL('../src/decision-room.html', import.meta.url), 'utf8');
const AID = '11111111-2222-4333-8444-555555555555';
const kase = (over = {}) => ({
  lesson_id: 'report-or-evidence', attempt_id: AID, version: 1, stage: 'judgment', status: 'in_progress',
  prompt: 'Which claim do the records support?', choices: [{ id: 'c1', label: 'one' }, { id: 'c2', label: 'two' }],
  messages: [{ role: 'academy', text: 'Inspect.', evidence: [{ name: 'log.txt', content: 'ok' }] }], ...over,
});
const APP_TOOLS = new Set(['start_lesson', 'submit_decision', 'resume_lesson']);

async function caseOpen(options) {
  const view = bootView(html, options);
  await view.connect();
  await view.toolResult(kase());
  await view.choose(0);
  return view;
}

test('a silent host times out into an explicit unknown result; Retry resends the identical request', async () => {
  const view = await caseOpen();
  view.q('commit').click(); await flush();
  const first = view.lastCall();
  assert.equal(first.message.params.name, 'submit_decision');
  assert.equal(view.q('retry').disabled, true, 'busy while the request is in flight');
  view.advance(19_999); await flush();
  assert.equal(view.q('retry').disabled, true);
  view.advance(1); await flush();
  assert.equal(view.q('sync').textContent, 'RESULT UNKNOWN');
  assert.match(view.q('status').textContent, /Result unknown/);
  assert.equal(view.q('retry').hidden, false);
  assert.equal(view.q('retry').disabled, false, 'Retry is usable after the timeout');
  assert.equal(view.q('commit').disabled, true, 'no new decision while the outcome is unknown');
  view.q('retry').click(); await flush();
  const second = view.lastCall();
  assert.notEqual(second.message.id, first.message.id);
  assert.deepEqual(second.message.params, first.message.params, 'same tool, args and request_id');
  // A late answer for the timed-out RPC id is dropped and must not render.
  await view.answer(first, kase({ version: 2, stage: 'verification', prompt: 'LATE' }));
  assert.notEqual(view.q('prompt').textContent, 'LATE');
  await view.answer(second, kase({ version: 2, stage: 'verification', prompt: 'Confirmed next stage' }));
  assert.equal(view.q('prompt').textContent, 'Confirmed next stage');
  assert.equal(view.q('retry').hidden, true);
  assert.equal(view.pendingTimers(), 0, 'answered requests clear their timers');
});

test('a 409 conflict drops the pending request and reloads the saved case', async () => {
  const view = await caseOpen();
  view.q('commit').click(); await flush();
  const submit = view.lastCall();
  await view.answer(submit, { error: 'version_conflict', status: 409 }, true);
  const reload = view.lastCall();
  assert.equal(reload.message.params.name, 'resume_lesson');
  assert.deepEqual(reload.message.params.arguments, { lesson_id: 'report-or-evidence' });
  assert.equal(view.q('retry').hidden, true, 'the rejected request is not offered for resend');
  await view.answer(reload, kase({ version: 3, stage: 'verification', prompt: 'Fresh read' }));
  assert.equal(view.q('prompt').textContent, 'Fresh read');
  assert.match(view.q('status').textContent, /not applied \(version_conflict\)/);
  await view.choose(1);
  assert.equal(view.q('commit').disabled, false, 'a new decision is possible after the fresh read');
  view.q('commit').click(); await flush();
  const next = view.lastCall();
  assert.equal(next.message.params.arguments.expected_version, 3);
  assert.notEqual(next.message.params.arguments.request_id, submit.message.params.arguments.request_id);
});

test('a transient 503 keeps the pending request for an exact retry', async () => {
  const view = await caseOpen();
  view.q('commit').click(); await flush();
  const submit = view.lastCall();
  await view.answer(submit, { error: 'lesson_unavailable', status: 503 }, true);
  assert.equal(view.q('retry').hidden, false);
  view.q('retry').click(); await flush();
  assert.deepEqual(view.lastCall().message.params, submit.message.params);
});

test('the evidence verdict is shown only on completion and only as text', async () => {
  const view = bootView(html); await view.connect();
  const record = [{ claim: 'Archive <img src=x onerror=alert(1)>', status: 'SUPPORTED' }, { claim: 'Recovery', status: 'UNVERIFIED' }];
  await view.toolResult(kase({ decision_record: record }));
  assert.equal(view.q('verdict').hidden, true, 'no verdict while in progress');
  assert.equal(view.q('verdict-list').children.length, 0);
  await view.toolResult(kase({ status: 'completed', stage: 'complete', version: 4, choices: [], decision_record: record }));
  assert.equal(view.q('verdict').hidden, false);
  const items = view.q('verdict-list').children;
  assert.equal(items.length, 2);
  assert.equal(items[0].textContent, 'SUPPORTED: Archive <img src=x onerror=alert(1)>');
  assert.ok(items.every(li => li.elements().every(n => ['strong'].includes(n.tagName))), 'no element besides <strong> created');
});

test('host origin is pinned after initialize; other origins and opaque hosts are handled', async () => {
  const view = bootView(html, { hostOrigin: 'https://host.example' });
  assert.equal(view.sent[0].targetOrigin, '*', 'initialize goes out before the origin is known');
  await view.connect();
  assert.equal(view.sent.at(-1).message.method, 'ui/notifications/initialized');
  assert.equal(view.sent.at(-1).targetOrigin, 'https://host.example');
  view.receive({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: kase({ prompt: 'FORGED' }) } }, { origin: 'https://evil.example' });
  await flush();
  assert.notEqual(view.q('prompt').textContent, 'FORGED');
  view.receive({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: kase({ prompt: 'FORGED' }) } }, { source: {} });
  await flush();
  assert.notEqual(view.q('prompt').textContent, 'FORGED');
  const opaque = bootView(html, { hostOrigin: 'null' }); await opaque.connect();
  assert.equal(opaque.sent.at(-1).targetOrigin, '*', 'opaque sandbox origin cannot be pinned');
});

test('the view only ever asks the host for app-visible tools', async () => {
  const view = await caseOpen();
  view.q('commit').click(); await flush();
  await view.answer(view.lastCall(), { error: 'stage_conflict', status: 409 }, true);
  await view.answer(view.lastCall(), kase());
  const startView = bootView(html); await startView.connect();
  await startView.toolResult({ error: 'no_attempt', status: 404 });
  startView.q('start').click(); await flush();
  for (const call of [...view.calls(), ...startView.calls()]) assert.ok(APP_TOOLS.has(call.message.params.name), call.message.params.name);
  assert.equal(startView.lastCall().message.params.name, 'start_lesson');
});
