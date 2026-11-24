import assert from 'node:assert/strict';
import test from 'node:test';
import { accessPolicy, browserErrorBody, invitationInput, invitationPage, INVITATION_PAGE_HEADERS } from '../src/invitation-page.mjs';
test('admission policy must be explicit and cannot silently accept an unknown mode', () => {
  assert.equal(accessPolicy(), 'approved-free-pilot');
  assert.equal(accessPolicy('session-only'), 'session-only');
  assert.equal(accessPolicy('approved-free-pilot'), 'approved-free-pilot');
  assert.throws(() => accessPolicy('free-for-everyone'));
});
test('invitation requests cannot nominate an owner, role, course or payment status', () => {
  const token = 'a'.repeat(42) + 'A';
  assert.equal(invitationInput({ token }), token);
  for (const body of [{ token, owner_id: 'other' }, { token, role: 'admin' }, { token, paid: true }, [], null, { token: 'short' }]) assert.equal(invitationInput(body), null);
});
test('invitation shell never exposes identity, invitation token or raw HTML session text', () => {
  const page = invitationPage({ csrf_token: '</script><img>', issuer: 'synthetic-private-issuer', subject: 'synthetic-private-subject', identity_id: 'synthetic-private-identity' }, { denied: true });
  assert.doesNotMatch(page, /<\/script><img>|style=|issuer|owner_id|synthetic-private/);
  const mailto = new URL(page.match(/href="(mailto:[^"]+)"/)[1]);
  assert.deepEqual([...mailto.searchParams], [['subject', 'Academy help']]);
  assert.match(page, /previously saved work is retained/);
  assert.match(page, /does not grant administrative rights or community membership/);
  assert.match(page, /action="\/academy\/auth\/invitation"/);
});

test('escaped CSRF JSON round trips without becoming HTML or changing the value', () => {
  const token = '</script><img>';
  const page = invitationPage({ csrf_token: token });
  const json = page.match(/id="academy-csrf">([^<]+)<\/script>/)[1];
  assert.equal(JSON.parse(json), token);
});

test('access help is visible without a session or JavaScript in every invitation state', () => {
  for (const session of [null, { csrf_token: 'synthetic-csrf' }]) {
    for (const options of [{}, { denied: true }, { failed: true }]) {
      const page = invitationPage(session, options);
      assert.match(page, /Creating an account does not give you a pilot place/);
      assert.match(page, /href="https:\/\/witnessops\.com\/support#support-request" target="_blank" rel="noopener noreferrer"/);
      assert.match(page, /href="mailto:engage@mail\.witnessops\.com\?subject=Academy%20help"/);
      assert.match(page, /An access request does not create a pilot place/);
      assert.ok(page.indexOf('Contact support') < page.indexOf('<noscript>'));
      assert.match(page, /method="post" action="\/academy\/auth\/invitation"/);
    }
  }
  assert.deepEqual(INVITATION_PAGE_HEADERS, { 'Referrer-Policy': 'same-origin' });
});

const browserErrors = ['login_state_missing', 'login_failed', 'email_verification_required', 'rate_limited', 'idp_unavailable', 'internal'];
test('known browser page failures offer fixed help without reflecting request or session data', () => {
  for (const path of ['/academy/auth/login', '/academy/auth/register', '/academy/auth/callback', '/academy/account', '/academy/invitation', '/academy/learn/report-or-evidence', '/academy/learn/same-scope']) {
    for (const method of ['GET', 'HEAD']) {
      for (const code of browserErrors) {
        const page = browserErrorBody({ method, url: path + '?code=synthetic-private-code&state=synthetic-private-state', headers: { accept: 'text/html,application/xhtml+xml', cookie: 'synthetic-private-cookie' }, body: 'synthetic-private-draft' }, code);
        assert.equal(typeof page, 'string');
        assert.match(page, /Help without signing in/);
        assert.match(page, /href="\/academy\/auth\/login"/);
        assert.match(page, /href="https:\/\/witnessops\.com\/support#support-request" target="_blank" rel="noopener noreferrer"/);
        assert.doesNotMatch(page, /synthetic-private|academy-csrf|<script|style=/);
      }
    }
  }
  assert.equal(typeof browserErrorBody({ method: 'GET', url: '/academy/auth/callback', headers: { 'sec-fetch-mode': 'navigate' } }, 'login_state_missing'), 'string');
});

test('API, form and non-HTML failures retain the exact JSON error body', () => {
  const requests = [
    { method: 'GET', url: '/academy/auth/callback', headers: { accept: 'application/json' } },
    { method: 'GET', url: '/academy/auth/callback', headers: { accept: 'text/html;q=0,application/json' } },
    { method: 'GET', url: '/academy/auth/callback', headers: {} },
    { method: 'GET', url: '/academy/api/lessons/report-or-evidence/draft', headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' } },
    { method: 'GET', url: '/academy/api/lessons/same-scope/draft', headers: { accept: 'text/html' } },
    { method: 'POST', url: '/academy/api/invitations/redeem', headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' } },
    { method: 'POST', url: '/academy/auth/invitation', headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' } },
    { method: 'POST', url: '/academy/auth/logout', headers: { accept: 'text/html' } },
    { method: 'GET', url: '/academy/learn/unlisted', headers: { accept: 'text/html' } },
    { method: 'GET', url: '/academy/static/lesson.js', headers: { accept: 'text/html' } },
    { method: 'GET', url: '/academy/healthz', headers: { accept: 'text/html' } },
  ];
  for (const req of requests) for (const code of browserErrors) assert.deepEqual(browserErrorBody(req, code), { error: code });
  assert.deepEqual(browserErrorBody({ method: 'GET', url: '/academy/auth/callback', headers: { accept: 'text/html' } }, 'unknown_error'), { error: 'unknown_error' });
});
