import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { loginDestination } from '../src/login-intent.mjs';
import {
  TEAMS_LINK_JS_ROUTE,
  TEAMS_LINK_PAGE_HEADERS,
  TEAMS_LINK_ROUTE,
  teamsLinkInput,
  teamsLinkPage,
} from '../src/teams-link-page.mjs';

const TOKEN = 'A'.repeat(43);

test('Teams link input accepts only one canonical 32-byte base64url token', () => {
  assert.equal(teamsLinkInput({ token: TOKEN }), TOKEN);
  for (const body of [null, [], {}, { token: 'short' }, { token: 'x'.repeat(43) }, { token: TOKEN, owner_id: 'other' }, { token: TOKEN, role: 'admin' }]) {
    assert.equal(teamsLinkInput(body), null);
  }
});

test('Teams link destination is fixed and includes only a validated sealed token', () => {
  assert.equal(TEAMS_LINK_ROUTE, '/academy/teams/link');
  assert.equal(TEAMS_LINK_JS_ROUTE, '/academy/static/teams-link.js');
  assert.equal(loginDestination({ returnTo: 'teams-link', teamsLinkToken: TOKEN }), `${TEAMS_LINK_ROUTE}#token=${TOKEN}`);
  for (const context of [
    { returnTo: 'teams-link', teamsLinkToken: 'short' },
    { returnTo: 'teams-link', teamsLinkToken: 'x'.repeat(43) },
    { returnTo: 'https://outsider.example.invalid/', teamsLinkToken: TOKEN },
  ]) assert.equal(loginDestination(context), '/academy/learn/report-or-evidence');
});

test('disabled Teams link page has no active form, token field or browser controller', () => {
  const page = teamsLinkPage({ csrf_token: 'synthetic-csrf' });
  assert.match(page, /Private Teams account linking is not enabled/);
  assert.doesNotMatch(page, /<form|teams-link-token|academy-csrf|teams-link\.js/);
});

test('Teams link shell keeps identities and tokens out while preserving existing work messaging', () => {
  const unsigned = teamsLinkPage(null, { enabled: true });
  assert.match(unsigned, /method="post" action="\/academy\/auth\/teams-link"/);
  assert.match(unsigned, /type="submit" disabled>Continue to sign in and link/);
  assert.doesNotMatch(unsigned, /academy-csrf|unlinked|synthetic-private/);

  const session = {
    csrf_token: '</script><img>', issuer: 'synthetic-private-issuer', subject: 'synthetic-private-subject',
    identity_id: 'synthetic-private-identity', tokens: 'synthetic-private-token',
  };
  const signed = teamsLinkPage(session, { enabled: true });
  assert.match(signed, /type="button" disabled>Link this Teams identity/);
  assert.match(signed, /does not grant pilot access, create another learner record, or move, copy or reset saved work/);
  assert.doesNotMatch(signed, /<\/script><img>|synthetic-private|issuer|subject|identity_id/);
  assert.equal(JSON.parse(signed.match(/id="academy-csrf">([^<]+)<\/script>/)[1]), session.csrf_token);
  assert.deepEqual(TEAMS_LINK_PAGE_HEADERS, { 'Referrer-Policy': 'same-origin' });

  const linked = teamsLinkPage(session, { enabled: true, linked: true });
  assert.match(linked, /id="unlink-teams-account"/);
  assert.doesNotMatch(linked, /id="teams-link-token"|action="\/academy\/auth\/teams-link"/);
});

function node(id, handlers) {
  return {
    id,
    disabled: false,
    hidden: false,
    textContent: '',
    value: '',
    addEventListener(name, handler) { handlers[`${id}:${name}`] = handler; },
  };
}

test('signed-out browser flow scrubs the fragment and submits the token only in a native POST body', async () => {
  const source = await readFile(new URL('../src/teams-link-client.js', import.meta.url), 'utf8');
  const handlers = {};
  const nodes = new Map([
    ['teams-link-form', node('form', handlers)],
    ['confirm-teams-link', node('confirm', handlers)],
    ['teams-link-token', node('token', handlers)],
    ['teams-link-page-status', node('status', handlers)],
  ]);
  let historyPath;
  let fetchCalled = false;
  vm.runInNewContext(source, {
    document: { getElementById: id => nodes.get(id) || null },
    location: { hash: `#token=${TOKEN}`, pathname: TEAMS_LINK_ROUTE, reload() {} },
    history: { replaceState(_state, _title, path) { historyPath = path; } },
    window: { addEventListener() {} },
    fetch: async () => { fetchCalled = true; throw new Error('unexpected fetch'); },
    URLSearchParams,
  });
  assert.equal(historyPath, TEAMS_LINK_ROUTE);
  assert.equal(nodes.get('teams-link-token').value, TOKEN);
  assert.equal(nodes.get('confirm-teams-link').disabled, false);
  let prevented = false;
  handlers['form:submit']({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(nodes.get('confirm-teams-link').disabled, true);
  assert.equal(fetchCalled, false);
});

test('signed-in browser flow confirms with CSRF and never places the token in a query or storage', async () => {
  const source = await readFile(new URL('../src/teams-link-client.js', import.meta.url), 'utf8');
  const handlers = {};
  const nodes = new Map([
    ['teams-link-form', node('form', handlers)],
    ['confirm-teams-link', node('confirm', handlers)],
    ['teams-link-token', node('token', handlers)],
    ['teams-link-page-status', node('status', handlers)],
    ['academy-csrf', { textContent: '"synthetic-csrf"' }],
  ]);
  let request;
  let historyPath;
  vm.runInNewContext(source, {
    document: { getElementById: id => nodes.get(id) || null },
    location: { hash: `#token=${TOKEN}`, pathname: TEAMS_LINK_ROUTE, reload() {} },
    history: { replaceState(_state, _title, path) { historyPath = path; } },
    window: { addEventListener() {} },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ linked: true }) };
    },
    URLSearchParams,
  });
  await handlers['confirm:click']();
  assert.equal(historyPath, TEAMS_LINK_ROUTE);
  assert.equal(request.url, '/academy/api/teams/link-confirm');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['X-CSRF-Token'], 'synthetic-csrf');
  assert.deepEqual(JSON.parse(request.options.body), { token: TOKEN });
  assert.equal(nodes.get('teams-link-token').value, '');
  assert.equal(nodes.get('teams-link-form').hidden, true);
  assert.match(nodes.get('teams-link-page-status').textContent, /saved work remain unchanged/);
  for (const forbidden of ['localStorage', 'sessionStorage', 'console.', 'location.search']) assert.equal(source.includes(forbidden), false);
});

test('linked account can unlink with CSRF without sending identity or token data', async () => {
  const source = await readFile(new URL('../src/teams-link-client.js', import.meta.url), 'utf8');
  const handlers = {};
  const unlink = node('unlink', handlers);
  const status = node('status', handlers);
  const nodes = new Map([
    ['unlink-teams-account', unlink],
    ['teams-link-page-status', status],
    ['academy-csrf', { textContent: '"synthetic-csrf"' }],
  ]);
  let request;
  vm.runInNewContext(source, {
    document: { getElementById: id => nodes.get(id) || null },
    location: { hash: '', pathname: TEAMS_LINK_ROUTE, reload() {} },
    history: { replaceState() {} },
    window: { addEventListener() {} },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ unlinked: true }) };
    },
    URLSearchParams,
  });
  await handlers['unlink:click']();
  assert.equal(request.url, '/academy/api/teams/unlink');
  assert.equal(request.options.headers['X-CSRF-Token'], 'synthetic-csrf');
  assert.equal(Object.hasOwn(request.options, 'body'), false);
  assert.equal(unlink.hidden, true);
  assert.match(status.textContent, /saved work are unchanged/);
});
