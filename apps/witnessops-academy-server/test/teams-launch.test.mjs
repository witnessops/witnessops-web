import test from 'node:test';
import assert from 'node:assert/strict';
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
  for (const forbidden of ['getAuthToken', 'identityId', 'access_token', 'Bearer ', 'save_decision', 'localStorage', 'sessionStorage']) assert.ok(!page.includes(forbidden), forbidden);
});
test('http loopback response does not claim HTTPS HSTS', () => {
  assert.equal(Object.hasOwn(teamsLaunchHeaders({ secure: false }), 'Strict-Transport-Security'), false);
});
