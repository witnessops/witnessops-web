import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { chatPage, chatConnectionPage } from '../src/chat-page.mjs';
import { LESSONS } from '../src/lesson-routes.mjs';
import { createAttempt, applyDecision, presentAttempt } from '../src/chat-engine.mjs';

test('each lesson binds its own chat API and keeps access to the existing worksheet', () => {
  for (const lesson of LESSONS) {
    const page = chatPage({ session: { csrf_token: 'synthetic-only' }, lesson });
    assert.ok(page.includes(`data-chat-api="/academy/api/lessons/${lesson.id}/chat"`));
    assert.ok(page.includes(`href="${lesson.route}?format=worksheet"`));
    assert.match(page, /data-academy-authenticated/);
    assert.match(page, /id="start-lesson"[^>]*disabled/);
    assert.match(page, /id="submit-decision"[^>]*disabled/);
    assert.match(page, /id="conversation"[^>]*role="log"[^>]*hidden/);
    assert.match(page, /id="decision-panel"[^>]*hidden/);
    assert.match(page, /id="lesson-complete"[^>]*hidden/);
    assert.match(page, /Simulated exercise · No real infrastructure involved/);
    assert.match(page, /No formal award is issued/);
    assert.doesNotMatch(page, /style=|onload=|onclick=|<iframe/);
    assert.match(page, /href="\/academy\/static\/chat.css"/);
    assert.match(page, /src="\/academy\/static\/chat.js"/);
  }
});

test('signed-out entry has no session token and does not enable a saved attempt', () => {
  for (const lesson of LESSONS) {
    const page = chatPage({ lesson });
    assert.doesNotMatch(page, /data-academy-authenticated|id="academy-csrf"/);
    assert.match(page, /id="start-lesson"[^>]*hidden/);
    assert.match(page, /id="sign-in"[^>]*>Sign in to start/);
    if (lesson.id === 'same-scope') assert.match(page, /auth\/login\?lesson=same-scope/);
  }
});

test('HTML rejects unlisted lessons and escapes session data without injecting learner content', () => {
  assert.throws(() => chatPage({ lesson: { id: 'unknown' } }), /Unknown chat lesson/);
  assert.throws(() => chatPage({ lesson: { id: '"><script>' } }), /Unknown chat lesson/);
  const csrf = '</script><img src=x onerror=alert(1)>';
  const page = chatPage({ session: { csrf_token: csrf }, lesson: LESSONS[0] });
  assert.doesNotMatch(page, /<\/script><img/);
  const json = page.match(/<script type="application\/json" id="academy-csrf">(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(json), csrf);
});

test('community link follows the existing safe navigation contract and only appears when signed in', () => {
  const source = { lesson: LESSONS[0], communityUrl: 'https://community.example.invalid/' };
  const page = chatPage({ ...source, session: { csrf_token: 'synthetic-only' } });
  assert.match(page, /href="https:\/\/community\.example\.invalid\/" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(chatPage(source), /href="https:\/\/community/);
  assert.throws(() => chatPage({ ...source, communityUrl: 'javascript:alert(1)' }), /Invalid Academy community URL/);
});

test('ChatGPT setup describes a protocol address without fabricating an installed plugin or one-click lesson', () => {
  const page = chatConnectionPage();
  assert.match(page, /CONNECTION SETUP/);
  assert.match(page, /https:\/\/academy\.witnessops\.com\/mcp/);
  assert.match(page, /does not confirm that the connection has been enabled or installed/);
  assert.match(page, /does not open a lesson chat/);
  assert.match(page, /Add custom MCP server/);
  assert.match(page, /OAuth/);
  assert.match(page, /https:\/\/help\.openai\.com\/en\/articles\/12584461/);
  assert.doesNotMatch(page, /https:\/\/chatgpt\.com\/plugins\/|chatgpt\.com\/?\?q=|data-academy-authenticated|src="\/academy\/static\/chat.js"/);
});

// Exercise the actual controller with a minimal DOM and synthetic transport. These
// checks do not claim browser layout or live identity/database acceptance.
const clientSource = readFileSync(new URL('../src/chat-client.js', import.meta.url), 'utf8');
function element(tag = 'div') {
  const events = new Map();
  let text = '';
  return {
    tagName: tag, children: [], dataset: {}, hidden: false, disabled: false,
    set textContent(value) { text = value; this.children = []; },
    get textContent() { return text + this.children.map(child => child.textContent).join(''); },
    set innerHTML(_) { throw new Error('HTML injection is not allowed'); },
    get lastElementChild() { return this.children.at(-1); },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { text = ''; this.children = [...nodes]; },
    addEventListener(name, fn) { events.set(name, fn); },
    fire(name, event = {}) { return events.get(name)?.(event); },
    setAttribute(name, value) { this[name] = value; },
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.tagName === selector ? [child] : []), ...child.querySelectorAll(selector)]); },
    focus() {}, scrollIntoView() {},
  };
}
const projection = (overrides = {}) => ({
  lesson_id: 'report-or-evidence', attempt_id: 'synthetic-attempt', lesson_version: 'synthetic-1', version: 1,
  stage: 'judgment', status: 'in_progress', title: 'Report or evidence?', objective: 'Read the records.',
  progress: { current: 1, total: 3 }, messages: [{ role: 'academy', text: 'Synthetic case.' }],
  prompt: 'What can you establish?', choices: [{ id: 'limited', label: 'Accept the supported findings.' }], ...overrides,
});
const response = (status, value) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(value) });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function controller({ read = () => response(200, projection()), write = () => response(200, projection({ version: 2 })) } = {}) {
  const ids = ['chat-status', 'lesson-welcome', 'conversation', 'decision-panel', 'decision-choices', 'submit-decision', 'start-lesson', 'retry-request', 'reload-attempt', 'lesson-complete', 'academy-csrf', 'final-record', 'decision-prompt', 'next-lesson', 'lesson-progress', 'step-label', 'sign-in', 'return-account', 'decision-form'];
  const nodes = new Map(ids.map(id => [id, element()]));
  const get = id => nodes.get(id);
  for (const id of ['conversation', 'decision-panel', 'retry-request', 'reload-attempt', 'lesson-complete', 'next-lesson', 'sign-in', 'return-account']) get(id).hidden = true;
  get('academy-csrf').textContent = JSON.stringify('synthetic-csrf');
  const main = element();
  main.dataset = { lessonId: 'report-or-evidence', chatApi: '/academy/api/lessons/report-or-evidence/chat' };
  const window = element();
  const calls = [];
  let sequence = 0;
  const boot = vm.runInNewContext(`(async () => {\n${clientSource}\n})()`, {
    document: { getElementById: get, querySelector: () => main, createElement: element,
      createTextNode: value => { const text = element('#text'); text.textContent = value; return text; } },
    window, location: { reload() {} }, AbortController, setTimeout, clearTimeout,
    crypto: { randomUUID: () => `synthetic-request-${++sequence}` },
    requestAnimationFrame: fn => fn(), matchMedia: () => ({ matches: true }),
    fetch: (url, options = {}) => {
      calls.push({ url, method: options.method || 'GET', body: options.body, headers: options.headers });
      return options.method === 'POST' ? write(options) : read();
    },
  });
  return { get, window, calls, boot };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function choose(page) {
  page.get('decision-choices').querySelectorAll('input')[0].fire('change');
  return page.get('decision-form').fire('submit', { preventDefault() {} });
}

test('opening an unstarted lesson does not persist anything until Start is selected', async () => {
  const page = controller({ read: () => response(404, { error: 'no_attempt' }), write: () => response(200, projection()) });
  await page.boot;
  assert.equal(page.calls.length, 1);
  assert.equal(page.calls[0].method, 'GET');
  assert.equal(page.get('start-lesson').disabled, false);
  page.get('start-lesson').fire('click');
  await tick();
  assert.equal(page.calls.length, 2);
  assert.deepEqual(JSON.parse(page.calls[1].body), { action: 'start', request_id: 'synthetic-request-1' });
  assert.equal(page.get('decision-panel').hidden, false);
  assert.equal(page.get('step-label').textContent, 'Decision 1 of 3');
});

test('an uncertain decision save is retried byte-for-byte without enabling a second decision', async () => {
  let writes = 0;
  const page = controller({ write: () => ++writes === 1 ? response(503, { error: 'unavailable' })
    : response(200, projection({ version: 2, stage: 'verification', progress: { current: 2, total: 3 } })) });
  await page.boot;
  choose(page);
  await tick();
  assert.match(page.get('chat-status').textContent, /not confirmed/);
  assert.equal(page.get('submit-decision').disabled, true);
  assert.equal(page.get('retry-request').hidden, false);
  await page.get('retry-request').fire('click');
  assert.equal(page.calls[1].body, page.calls[2].body);
  assert.equal(page.calls[1].headers['X-CSRF-Token'], 'synthetic-csrf');
  assert.equal(page.get('step-label').textContent, 'Decision 2 of 3');
  assert.match(page.get('chat-status').textContent, /^Saved/);
});

test('a version conflict locks choices until the learner explicitly loads the saved state', async () => {
  const page = controller({ write: () => response(409, { error: 'version_conflict' }) });
  await page.boot;
  choose(page);
  await tick();
  assert.equal(page.get('submit-decision').disabled, true);
  assert.equal(page.get('decision-choices').querySelectorAll('input')[0].disabled, true);
  assert.equal(page.get('reload-attempt').hidden, false);
  assert.match(page.get('chat-status').textContent, /changed in another window/);
  await page.get('reload-attempt').fire('click');
  assert.equal(page.get('decision-choices').querySelectorAll('input')[0].disabled, false);
});

test('a confirmed replay can resume a newer version advanced through another interface', async () => {
  let writes = 0;
  const page = controller({ write: () => ++writes === 1 ? response(503, { error: 'unavailable' })
    : response(200, projection({ version: 3, replay: true, stage: 'final', progress: { current: 3, total: 3 } })) });
  await page.boot;
  choose(page);
  await tick();
  await page.get('retry-request').fire('click');
  assert.equal(page.calls[1].body, page.calls[2].body);
  assert.equal(page.get('step-label').textContent, 'Decision 3 of 3');
  assert.match(page.get('chat-status').textContent, /^Saved/);
  assert.equal(page.get('retry-request').hidden, true);
});

test('an unconfirmed version jump cannot be accepted as a saved decision', async () => {
  const page = controller({ write: () => response(200, projection({ version: 3, stage: 'final', progress: { current: 3, total: 3 } })) });
  await page.boot;
  choose(page);
  await tick();
  assert.match(page.get('chat-status').textContent, /not confirmed/);
  assert.equal(page.get('retry-request').hidden, false);
  assert.equal(page.get('step-label').textContent, 'Decision 1 of 3');
});

for (const outcome of ['read', 'write']) {
  test(`a late ${outcome} cannot repopulate a cached page after pagehide`, async () => {
    const pending = deferred();
    const page = controller(outcome === 'read' ? { read: () => pending.promise } : { write: () => pending.promise });
    if (outcome === 'write') { await page.boot; choose(page); }
    page.window.fire('pagehide');
    const message = page.get('chat-status').textContent;
    pending.resolve(response(200, projection({ version: 2 })));
    await page.boot;
    await tick();
    assert.equal(page.get('conversation').textContent, '');
    assert.equal(page.get('decision-panel').hidden, true);
    assert.equal(page.get('lesson-complete').hidden, true);
    assert.equal(page.get('chat-status').textContent, message);
    assert.equal(page.get('academy-csrf').textContent, '""');
  });
}

test('expired or changed access clears private messages and choices', async () => {
  for (const code of [401, 403]) {
    const page = controller({ write: () => response(code, { error: 'access_unavailable' }) });
    await page.boot;
    choose(page);
    await tick();
    assert.equal(page.get('conversation').textContent, '');
    assert.equal(page.get('decision-choices').textContent, '');
    assert.equal(page.get('lesson-complete').hidden, true);
    assert.equal(page.get('start-lesson').hidden, true);
  }
});

test('completion comes only from server state; review-required attempts do not get a completion card', async () => {
  for (const state of ['completed', 'review_required']) {
    const page = controller({ read: () => response(200, projection({ status: state, stage: state,
      choices: [], prompt: '', progress: { current: 3, total: 3 },
      messages: [{ role: 'academy', text: '<img src=x onerror=alert(1)>', evidence: [{ name: 'record.txt', content: '<script>unsafe</script>' }] }],
      decision_record: [{ claim: 'Recovery', status: 'UNVERIFIED' }], next_lesson_id: 'same-scope' })) });
    await page.boot;
    assert.equal(page.get('lesson-complete').hidden, state !== 'completed');
    assert.equal(page.get('next-lesson').hidden, state !== 'completed');
    assert.ok(page.get('conversation').textContent.includes('<img src=x'));
    assert.equal(page.get('conversation').querySelectorAll('img').length, 0);
    if (state === 'completed') assert.equal(page.get('next-lesson').href, '/academy/learn/same-scope');
  }
});

test('the actual lesson engine projection renders and advances through the actual chat controller', async () => {
  let state = createAttempt({ lessonId: 'report-or-evidence', seed: 'ui-contract-case', attemptId: '00000000-0000-4000-8000-000000000001' });
  let version = 1;
  const page = controller({ read: () => response(200, presentAttempt(state, { version })), write: options => {
    const input = JSON.parse(options.body);
    assert.equal(input.expected_version, version);
    state = applyDecision(state, { stage: input.stage, choice_id: input.choice_id });
    version += 1;
    return response(200, presentAttempt(state, { version }));
  } });
  await page.boot;
  assert.ok(page.get('conversation').textContent.includes('backup-job.log'));
  assert.equal(page.get('step-label').textContent, 'Decision 1 of 3');
  choose(page);
  await tick();
  assert.equal(page.get('step-label').textContent, 'Decision 2 of 3');
  assert.equal(state.decisions.length, 1);
  choose(page);
  await tick();
  assert.equal(page.get('step-label').textContent, 'Decision 3 of 3');
  assert.equal(state.decisions.length, 2);
  const supported = presentAttempt(state).choices.find(item => presentAttempt(applyDecision(state, { stage: 'final', choice_id: item.id })).status === 'completed');
  const input = page.get('decision-choices').querySelectorAll('input').find(item => item.value === supported.id);
  input.fire('change');
  page.get('decision-form').fire('submit', { preventDefault() {} });
  await tick();
  assert.equal(state.decisions.length, 3);
  assert.equal(page.get('lesson-complete').hidden, false);
  assert.equal(page.get('next-lesson').href, '/academy/learn/same-scope');
});
