import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { teamsLaunchHeaders, teamsLaunchPage, TEAMS_LAUNCH_ROUTE, TEAMS_JS_ROUTE, TEAMS_CSS_ROUTE } from '../src/teams-launch.mjs';
test('Teams launch route is separate from protected Academy lesson pages', () => {
  assert.equal(TEAMS_LAUNCH_ROUTE, '/academy/teams/launch');
  assert.equal(TEAMS_JS_ROUTE, '/academy/static/teams-launch.js');
  assert.equal(TEAMS_CSS_ROUTE, '/academy/static/teams-launch.css');
  assert.ok(!TEAMS_LAUNCH_ROUTE.startsWith('/academy/learn/'));
});
test('Teams framing is allowed only on the public response headers', () => {
  const headers = teamsLaunchHeaders();
  assert.ok(!Object.hasOwn(headers, 'X-Frame-Options'));
  assert.match(headers['Content-Security-Policy'], /frame-ancestors https:\/\/teams\.microsoft\.com/);
  assert.match(headers['Content-Security-Policy'], /https:\/\/\*\.cloud\.microsoft/);
  assert.match(headers['Content-Security-Policy'], /object-src 'none'/);
  assert.match(headers['Content-Security-Policy'], /form-action 'none'/);
  assert.match(headers['Content-Security-Policy'], /connect-src 'none'/);
  assert.match(teamsLaunchHeaders({ bridgeEnabled: true })['Content-Security-Policy'], /connect-src 'self'/);
  assert.doesNotMatch(teamsLaunchHeaders({ bridgeEnabled: true })['Content-Security-Policy'], /connect-src 'none'/);
  assert.equal(headers['Cache-Control'], 'no-store');
});
test('Teams landing page contains only fixed Academy case links', () => {
  const page = teamsLaunchPage();
  const links = [...page.matchAll(/<a href="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(links, [
    'https://academy.witnessops.com/academy/learn/report-or-evidence',
    'https://academy.witnessops.com/academy/learn/same-scope',
  ]);
  assert.match(page, /MicrosoftTeams\.min\.js/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(page, /id="link-teams-account"/);
  for (const forbidden of ['getAuthToken', 'identityId', 'access_token', 'Bearer ', 'save_decision', 'localStorage', 'sessionStorage']) assert.ok(!page.includes(forbidden), forbidden);
});
test('Teams account linking UI is rendered only when the bridge is explicitly enabled', () => {
  const page = teamsLaunchPage({ bridgeEnabled: true });
  assert.match(page, /id="link-teams-account" type="button" disabled/);
  assert.match(page, /does not grant lesson access or move, copy or reset your saved work/);
  assert.doesNotMatch(page, /access_token|Authorization|Bearer |identityId|owner_id/);
});

test('Teams SSO token is requested only by an explicit click and only a fixed fragment URL is opened', async () => {
  const source = await readFile(new URL('../src/teams-launch-client.js', import.meta.url), 'utf8');
  const handlers = {};
  const status = { textContent: '' };
  const linkStatus = { textContent: '' };
  const linkButton = {
    disabled: true,
    addEventListener(name, handler) { handlers[name] = handler; },
  };
  const nodes = new Map([
    ['teams-status', status],
    ['link-teams-account', linkButton],
    ['teams-link-status', linkStatus],
  ]);
  let authCalls = 0;
  let request;
  let opened;
  const token = 'A'.repeat(43);
  const boot = vm.runInNewContext(source, {
    document: { getElementById: id => nodes.get(id) || null },
    window: {
      addEventListener() {},
      microsoftTeams: {
        app: {
          initialize: async () => {},
          openLink: async url => { opened = url; },
        },
        authentication: {
          getAuthToken: async () => { authCalls += 1; return 'synthetic-entra-access-token'; },
        },
      },
    },
    location: { origin: 'https://academy.witnessops.com', reload() {} },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ token }) };
    },
    URL,
    URLSearchParams,
  });
  await boot;
  assert.equal(authCalls, 0);
  assert.equal(linkButton.disabled, false);
  await handlers.click();
  assert.equal(authCalls, 1);
  assert.equal(request.url, '/academy/api/teams/link-intents');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.Authorization, 'Bearer synthetic-entra-access-token');
  assert.equal(opened, `https://academy.witnessops.com/academy/teams/link#token=${token}`);
  assert.doesNotMatch(opened, /\?/);
  assert.match(linkStatus.textContent, /Continue in the Academy window/);
  for (const forbidden of ['localStorage', 'sessionStorage', 'console.log', 'location.search']) assert.doesNotMatch(source, new RegExp(forbidden.replace('.', '\\.')));
});
test('http loopback response does not claim HTTPS HSTS', () => {
  assert.equal(Object.hasOwn(teamsLaunchHeaders({ secure: false }), 'Strict-Transport-Security'), false);
});
