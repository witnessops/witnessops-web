import assert from 'node:assert/strict';
import test from 'node:test';
import { isLessonProjection, mountLessonChat } from '../src/lesson-chat-client.js';
import { projectLessonChat } from '../src/lesson-chat-engine.mjs';

const initial = () => ({ lesson_id: 'report-or-evidence', revision: 'backup-review-v1',
  title: 'Report or evidence?', subtitle: 'It’s done. Prove it.', simulated: true,
  version: 0, updated_at: null, saved: false, step_id: 'judgment', step_number: 1,
  total_steps: 3, completed: false, prompt: 'What does the evidence support?',
  messages: [{ role: 'tutor', text: 'Backup completed successfully. All data is protected. Task closed.' }],
  evidence: [{ id: 'backup-log', title: 'backup-job.log', content: '09:05 Upload completed\n09:05 Exit code: 0' }],
  options: [{ id: 'supported', label: 'Backup created and uploaded; recovery unverified.' }, { id: 'reject', label: 'Reject everything.' }], outcome: null });
const advanced = (version = 1) => ({ ...initial(), version, saved: true,
  updated_at: '2026-11-25T01:00:00.000Z', step_id: 'verification', step_number: 2,
  messages: [...initial().messages, { role: 'learner', text: initial().options[0].label }, { role: 'tutor', text: 'The log supports creation and upload.' }],
  prompt: 'Choose one additional check.', options: [{ id: 'restore', label: 'Controlled restore against expected inventory.' }] });
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.listeners = new Map(); this.dataset = {}; this.disabled = false; this.hidden = false; this._text = ''; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  set innerHTML(_) { throw new Error('Learner or lesson text must not enter HTML'); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  fire(type, event = {}) { return this.listeners.get(type)?.(event); }
  querySelectorAll(tag) { return this.children.flatMap(child => [...(child.tagName === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  focus() { this.focused = true; }
}
function page({ signedIn = true, get = () => response(200, initial()), post = () => response(200, advanced()),
  logout = () => response(200, { idp_logout: 'complete' }), api = '/academy/api/lessons/report-or-evidence/chat', hash = '' } = {}) {
  const nodes = new Map(['lesson-chat', 'chat-status', 'retry-decision', 'reload-progress', 'chat-sign-in', 'chat-sign-out',
    'chat-messages', 'chat-evidence', 'chat-options', 'chat-prompt', 'chat-progress', 'chat-step', 'chat-outcome', 'outcome-facts', 'academy-csrf', 'chatgpt-help']
    .map(id => [id, new Element()]));
  const node = id => nodes.get(id);
  node('lesson-chat').dataset.api = api;
  node('academy-csrf').textContent = JSON.stringify(signedIn ? 'synthetic-csrf' : '');
  node('chat-sign-in').hidden = signedIn;
  node('chat-sign-out').hidden = !signedIn;
  node('chat-outcome').hidden = true;
  const window = new Element();
  const calls = [];
  let uuidCalls = 0, reloads = 0;
  const controller = mountLessonChat({ document: { querySelector: selector => nodes.get(selector.slice(1)), createElement: tag => new Element(tag) }, window,
    fetch: (url, options = {}) => {
      calls.push({ url, ...options });
      return url.endsWith('/logout') ? logout() : options.method === 'POST' ? post() : get();
    }, crypto: { randomUUID: () => { uuidCalls++; return '11111111-1111-4111-8111-111111111111'; } },
    location: { hash, reload: () => { reloads++; } }, confirm: () => true });
  return { node, window, calls, controller, uuidCalls: () => uuidCalls, reloads: () => reloads,
    choose: index => node('chat-options').children[index].fire('click') };
}

test('signed-out page performs no progress or mutation request', async () => {
  const view = page({ signedIn: false });
  await view.controller.ready;
  assert.equal(view.calls.length, 0);
});
test('unrecognized API fails before any request', () => {
  assert.throws(() => page({ api: '/academy/api/someone-else' }), /Unsupported lesson/);
});
test('initial read renders evidence as text and never creates saved progress', async () => {
  const state = initial(); state.evidence[0].content = '<img src=x onerror=alert(1)>';
  const view = page({ get: () => response(200, state) });
  await view.controller.ready;
  assert.deepEqual(view.calls.map(call => [call.url, call.method || 'GET']), [['/academy/api/lessons/report-or-evidence/chat', 'GET']]);
  assert.equal(view.node('chat-evidence').children[0].children[1].textContent, state.evidence[0].content);
  assert.match(view.node('chat-status').textContent, /Ready when you are/);
  assert.equal(view.node('chat-options').children[0].disabled, false);
});
test('a selected decision sends the exact contract and confirmed progress advances', async () => {
  const view = page(); await view.controller.ready; await view.choose(0);
  const call = view.calls[1];
  assert.equal(call.url, '/academy/api/lessons/report-or-evidence/chat/decision');
  assert.equal(call.method, 'POST');
  assert.equal(call.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(call.body), { lesson_id: 'report-or-evidence', step_id: 'judgment', option_id: 'supported', expected_version: 0, request_id: '11111111-1111-4111-8111-111111111111' });
  assert.equal(view.node('chat-step').textContent, 'Step 2 of 3');
  assert.equal(view.node('chat-messages').children[2].focused, true);
  assert.match(view.node('chat-status').textContent, /Choice saved/);
});
test('ambiguous save stays locked and explicit retry reuses the identical request', async () => {
  let attempt = 0;
  const view = page({ post: () => ++attempt === 1 ? response(503, {}) : response(200, advanced()) });
  await view.controller.ready; await view.choose(0);
  assert.equal(view.node('retry-decision').hidden, false);
  assert.equal(view.node('chat-options').children[0].disabled, true);
  await view.choose(1);
  assert.equal(view.calls.length, 2);
  await view.node('retry-decision').fire('click');
  assert.equal(view.calls[1].body, view.calls[2].body);
  assert.equal(view.uuidCalls(), 1);
  assert.match(view.node('chat-status').textContent, /Choice saved/);
});
test('double clicks cannot send the same or another choice concurrently', async () => {
  const pending = deferred(); const view = page({ post: () => pending.promise });
  await view.controller.ready; const choosing = view.choose(0); await view.choose(1);
  assert.equal(view.calls.length, 2);
  pending.resolve(response(200, advanced())); await choosing;
});
test('revision conflict requires a fresh read and never resends automatically', async () => {
  let reads = 0;
  const view = page({ get: () => response(200, reads++ ? advanced(2) : initial()), post: () => response(409, {}) });
  await view.controller.ready; await view.choose(0);
  assert.equal(view.node('reload-progress').hidden, false);
  assert.equal(view.node('chat-options').children[0].disabled, true);
  assert.match(view.node('chat-status').textContent, /another window or ChatGPT/);
  assert.equal(view.calls.length, 2);
  await view.node('reload-progress').fire('click');
  assert.equal(view.calls.length, 3);
  assert.equal(view.calls[2].method, undefined);
  assert.equal(view.node('chat-step').textContent, 'Step 2 of 3');
});
for (const body of [{ ...advanced(), version: 6 }, { ...advanced(), simulated: false }, { error: 'internal' },
  { ...advanced(), step_id: 'complete', completed: true, options: [], outcome: null }]) {
  test('malformed success is not promoted to a confirmed save', async () => {
    const view = page({ post: () => response(200, body) }); await view.controller.ready; await view.choose(0);
    assert.match(view.node('chat-status').textContent, /not confirmed/);
    assert.equal(view.node('retry-decision').hidden, false);
    assert.equal(view.node('chat-step').textContent, 'Step 1 of 3');
  });
}
for (const phase of ['response', 'body']) {
  test(`late load ${phase} cannot expose text after pagehide`, async () => {
    const pending = deferred();
    const view = page({ get: () => phase === 'response' ? pending.promise : { ...response(200, null), json: () => pending.promise } });
    await Promise.resolve(); view.window.fire('pagehide');
    pending.resolve(phase === 'response' ? response(200, advanced()) : advanced());
    await view.controller.ready;
    assert.equal(view.node('chat-messages').textContent, '');
    assert.equal(view.node('chat-options').children.length, 0);
    assert.equal(view.node('chat-sign-in').hidden, false);
  });
}
test('late decision cannot redraw a suspended page and cached return requires reload', async () => {
  const pending = deferred(); const view = page({ post: () => pending.promise });
  await view.controller.ready; const choosing = view.choose(0); view.window.fire('pagehide');
  pending.resolve(response(200, advanced())); await choosing;
  assert.equal(view.node('chat-messages').textContent, '');
  assert.equal(view.node('chat-options').children.length, 0);
  view.window.fire('pageshow', { persisted: true });
  assert.equal(view.reloads(), 1);
});
test('revoked admission clears the previous private conversation', async () => {
  const view = page({ post: () => response(403, {}) }); await view.controller.ready; await view.choose(0);
  assert.equal(view.node('chat-messages').textContent, '');
  assert.equal(view.node('chat-evidence').textContent, '');
  assert.equal(view.node('chat-sign-in').hidden, false);
});
test('partial login-service logout clears private progress and reports the limit', async () => {
  const view = page({ logout: () => response(502, { idp_logout: 'pending' }) });
  await view.controller.ready; await view.node('chat-sign-out').fire('click');
  assert.equal(view.node('chat-messages').textContent, '');
  assert.match(view.node('chat-status').textContent, /Sign-out at the login service is incomplete/);
});
test('completion displays the server outcome and no further choice', async () => {
  const complete = { ...advanced(), step_id: 'complete', step_number: 3, completed: true, options: [],
    outcome: { creation: 'SUPPORTED', recovery: 'UNVERIFIED', closure: 'BLOCKED', next_action: 'Controlled restore against expected inventory.' } };
  const view = page({ post: () => response(200, complete) }); await view.controller.ready; await view.choose(0);
  assert.equal(view.node('chat-outcome').hidden, false);
  assert.equal(view.node('chat-options').children.length, 0);
  assert.match(view.node('outcome-facts').textContent, /UNVERIFIED/);
  assert.match(view.node('chat-status').textContent, /Lesson complete/);
});
test('projection validation rejects duplicate options and unbounded or foreign records', () => {
  assert.equal(isLessonProjection(initial()), true);
  for (const state of [{ ...initial(), lesson_id: 'other' }, { ...initial(), options: [initial().options[0], initial().options[0]] },
    { ...initial(), messages: [{ role: 'system', text: 'authority' }] }, { ...initial(), saved: true },
    { ...initial(), evidence: [{ id: 'log', title: 'log', content: 'x'.repeat(12001) }] }]) assert.equal(isLessonProjection(state), false);
});
test('shared engine projections remain renderable through incorrect and corrected choices', () => {
  const decisions = [];
  const choices = [['judgment', 'nothing_established'], ['verification', 'ask_agent'], ['closure', 'accept_and_close'],
    ['closure', 'reject_everything'], ['closure', 'accept_supported_require_restore']];
  assert.equal(isLessonProjection(projectLessonChat(decisions)), true);
  for (const [step_id, option_id] of choices) {
    decisions.push({ step_id, option_id });
    assert.equal(isLessonProjection(projectLessonChat(decisions, { version: decisions.length,
      updated_at: '2026-11-25T01:00:00.000Z' })), true);
  }
});
test('ChatGPT entry fragment opens the instructions without making a progress request', async () => {
  const view = page({ signedIn: false, hash: '#chatgpt-help' });
  await view.controller.ready;
  assert.equal(view.node('chatgpt-help').open, true);
  assert.equal(view.calls.length, 0);
});
