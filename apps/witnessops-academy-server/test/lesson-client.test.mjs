import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { parseProgress } from '../../witnessops-academy/public/lesson-progress.mjs';

const source = readFileSync(new URL('../src/lesson-client.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '');
const saved = { claims: [{ label: 'Evidenced', reason: 'Previous learner text' }, {}, {}], limit: '' };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function element() {
  const listeners = new Map();
  return { value: '', textContent: '', disabled: false, hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    fire: (name, event = {}) => listeners.get(name)?.(event) };
}
function lesson({ draft = () => response(200, { version: 1, content: JSON.stringify(saved) }),
  logout = () => response(200, { idp_logout: 'complete' }),
  put = () => response(200, { version: 2 }) } = {}) {
  const nodes = new Map(['lesson-form', 'progress-status', 'save-progress', 'sign-out', 'sign-in',
    'retry-load', 'other-draft', 'saved-text', 'academy-csrf', 'teacher-reply', 'start-retry',
    'replace-draft', 'reason-1'].map(id => ['#' + id, element()]));
  const get = id => nodes.get('#' + id);
  get('academy-csrf').textContent = JSON.stringify('synthetic-csrf');
  get('sign-in').hidden = get('other-draft').hidden = true;
  const window = element();
  const fields = [get('reason-1'), get('teacher-reply'), get('start-retry')];
  const context = { document: { querySelector: key => nodes.get(key), querySelectorAll: () => fields },
    window, TextEncoder, crypto: { randomUUID: () => 'synthetic-save-request' }, confirm: () => true,
    location: { reload() {} }, parseProgress,
    collectProgress: () => ({ ...saved, claims: [{ ...saved.claims[0], reason: get('reason-1').value }, {}, {}] }),
    restoreProgress: progress => { get('reason-1').value = progress.claims[0].reason; },
    clearPageState: () => { fields.forEach(field => { field.value = ''; }); },
    fetch: (url, options = {}) => url.endsWith('/logout') ? logout()
      : options.method === 'PUT' ? put() : draft() };
  const boot = vm.runInNewContext('(async () => {\n' + source + '\n})()', context);
  return { get, window, boot };
}
function cleared(page, expectedStatus) {
  assert.equal(page.get('reason-1').value, '');
  assert.equal(page.get('saved-text').value, '');
  assert.equal(page.get('reason-1').disabled, true);
  assert.equal(page.get('save-progress').hidden, true);
  assert.equal(page.get('sign-in').hidden, false);
  assert.equal(page.get('progress-status').textContent, expectedStatus);
}
for (const end of ['logout', 'pagehide']) {
  for (const outcome of ['saved', 'no-draft', 'failure']) {
    test(`late ${outcome} response cannot update the page after ${end}`, async () => {
      const pending = deferred();
      const page = lesson({ draft: () => pending.promise });
      if (end === 'logout') await page.get('sign-out').fire('click');
      else page.window.fire('pagehide');
      const status = page.get('progress-status').textContent;
      const reply = outcome === 'saved' ? response(200, { version: 1, content: JSON.stringify(saved) })
        : outcome === 'no-draft' ? response(404, { error: 'no_draft' }) : response(503, { error: 'unavailable' });
      pending.resolve(reply);
      await page.boot;
      cleared(page, status);
      assert.equal(page.get('retry-load').hidden, true);
    });
  }
  for (const outcome of ['saved', 'no-draft', 'invalid-json']) {
    test(`late ${outcome} body cannot update the page after ${end}`, async () => {
      const body = deferred(), reading = deferred();
      const reply = response(outcome === 'no-draft' ? 404 : 200, null);
      reply.json = () => { reading.resolve(); return body.promise; };
      const page = lesson({ draft: () => reply });
      await reading.promise;
      if (end === 'logout') await page.get('sign-out').fire('click');
      else page.window.fire('pagehide');
      const status = page.get('progress-status').textContent;
      if (outcome === 'invalid-json') body.reject(new SyntaxError('synthetic malformed JSON'));
      else body.resolve(outcome === 'no-draft' ? { error: 'no_draft' }
        : { version: 1, content: JSON.stringify(saved) });
      await page.boot;
      cleared(page, status);
      assert.equal(page.get('retry-load').hidden, true);
    });
  }
}
for (const report of ['pending', 'failed']) {
  test(`local work clears when the login service logout is ${report}`, async () => {
    const page = lesson({ logout: () => response(502, { idp_logout: report }) });
    await page.boot;
    assert.equal(page.get('reason-1').value, saved.claims[0].reason);
    await page.get('sign-out').fire('click');
    const status = page.get('progress-status').textContent;
    assert.match(status, /Signed out of Academy/);
    assert.match(status, /incomplete/);
    cleared(page, status);
  });
}
test('a late save response cannot unlock a suspended page', async () => {
  const pending = deferred();
  const page = lesson({ put: () => pending.promise });
  await page.boot;
  page.get('reason-1').value = 'Unsaved synthetic edit';
  page.get('lesson-form').fire('input');
  const saving = page.get('save-progress').fire('click');
  page.window.fire('pagehide');
  const status = page.get('progress-status').textContent;
  pending.resolve(response(200, { version: 2 }));
  await saving;
  cleared(page, status);
});
