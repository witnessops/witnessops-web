import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { accountPage, registrationEnabled } from '../src/account-page.mjs';
import { authorizationIntent, loginDestination, registrationClaimsAccepted } from '../src/login-intent.mjs';

test('registration is closed by default and cannot open on an unknown setting', () => {
  assert.equal(registrationEnabled(), false);
  assert.equal(registrationEnabled('false'), false);
  assert.equal(registrationEnabled('true'), true);
  for (const value of ['', 'yes', '1', 'false ', 'public', true]) assert.throws(() => registrationEnabled(value));
  const closed = accountPage(null);
  assert.match(closed, /Account creation is not open yet/);
  assert.doesNotMatch(closed, /href="\/academy\/auth\/register"/);
  assert.match(closed, /href="\/academy\/auth\/login\?return=account"/);
  assert.match(closed, /Contact support/);
});

test('public account creation goes to Keycloak without an Academy password form or invitation demand', () => {
  const page = accountPage(null, { registration: true });
  assert.match(page, /id="create-account" href="\/academy\/auth\/register">Create account/);
  assert.match(page, /Verify your email/);
  assert.match(page, /Creating an account does not enrol you in the pilot/);
  assert.doesNotMatch(page, /<form|<input|academy-csrf|community-link/);
  assert.deepEqual(authorizationIntent(), { scope: 'openid' });
  assert.deepEqual(authorizationIntent(true), { scope: 'openid email', prompt: 'create' });
  assert.deepEqual(authorizationIntent('create'), { scope: 'openid' });
});

test('registration requires an actual verified-email claim and never changes ordinary login claims', () => {
  for (const claims of [null, {}, { email_verified: false }, { email_verified: 'true' }, { email_verified: 1 }]) {
    assert.equal(registrationClaimsAccepted({ registration: true }, claims), false);
  }
  assert.equal(registrationClaimsAccepted({ registration: true }, { email_verified: true }), true);
  assert.equal(registrationClaimsAccepted({}, {}), true);
});

test('login returns only to a fixed account page or one of the existing lessons', () => {
  assert.equal(loginDestination({ returnTo: 'account' }), '/academy/account');
  assert.equal(loginDestination({ lessonId: 'same-scope' }), '/academy/learn/same-scope');
  for (const returnTo of ['https://outsider.example.invalid/', '//outsider.example.invalid/', '/academy/account']) {
    assert.equal(loginDestination({ returnTo, lessonId: 'https://outsider.example.invalid/' }), '/academy/learn/report-or-evidence');
  }
});

test('a signed-in account is useful without a pilot grant and keeps secret identity data out of HTML', () => {
  const session = { csrf_token: '</script><img>', issuer: 'synthetic-private-issuer', subject: 'synthetic-private-subject', identity_id: 'synthetic-private-id', tokens: 'synthetic-private-token' };
  const page = accountPage(session, { registration: true, communityUrl: 'https://community.example.invalid/' });
  assert.match(page, /Your WitnessOps account is ready/);
  assert.match(page, /id="community-link"/);
  assert.match(page, /Private rooms have their own access rules/);
  assert.match(page, /Creating an account does not enrol you in the pilot/);
  assert.doesNotMatch(page, /synthetic-private|<\/script><img>|href="\/academy\/learn\/|id="create-account"/);
  assert.equal(JSON.parse(page.match(/id="academy-csrf">([^<]+)<\/script>/)[1]), session.csrf_token);
  const mailto = new URL(page.match(/href="(mailto:[^"]+)"/)[1]);
  assert.deepEqual([...mailto.searchParams], [['subject', 'Academy help']]);
});

test('saved lessons appear only for a signed-in admitted account', () => {
  assert.doesNotMatch(accountPage(null, { admitted: true }), /Your pilot place is active|href="\/academy\/learn\//);
  const page = accountPage({ csrf_token: 'synthetic-csrf' }, { admitted: true });
  assert.match(page, /Your pilot place is active/);
  assert.match(page, /href="\/academy\/learn\/report-or-evidence"/);
  assert.match(page, /href="\/academy\/learn\/same-scope"/);
  assert.match(page, /These previews do not save your work/);
});

test('account sign-out retains an incomplete identity logout warning and removes signed-in actions', async () => {
  const source = await readFile(new URL('../src/account-client.js', import.meta.url), 'utf8');
  for (const idp_logout of ['pending', 'failed']) {
    let handler, request, redirected = false;
    const nodes = new Map(['#sign-out', '#account-status', '#account-actions', '#academy-csrf', '#signed-out-entry'].map(id => [id, { hidden: false, disabled: false, textContent: id === '#academy-csrf' ? '"synthetic-csrf"' : '', addEventListener: (_name, fn) => { handler = fn; } }]));
    vm.runInNewContext(source, {
      document: { querySelector: id => nodes.get(id) },
      window: { addEventListener() {} },
      location: { replace() { redirected = true; } },
      fetch: async (url, options) => { request = { url, options }; return { status: 502, ok: false, json: async () => ({ idp_logout }) }; },
    });
    await handler();
    assert.equal(request.url, '/academy/auth/logout');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['X-CSRF-Token'], 'synthetic-csrf');
    assert.equal(nodes.get('#account-actions').hidden, true);
    assert.equal(nodes.get('#sign-out').hidden, true);
    assert.equal(nodes.get('#signed-out-entry').hidden, false);
    assert.equal(nodes.get('#academy-csrf').textContent, '""');
    assert.match(nodes.get('#account-status').textContent, /Identity sign-out is incomplete/);
    assert.equal(redirected, false);
  }
});
