import assert from 'node:assert/strict';
import test from 'node:test';
import { accessPolicy, invitationInput, invitationPage } from '../src/invitation-page.mjs';
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
  const page = invitationPage({ csrf_token: '</script><img>' }, { denied: true });
  assert.doesNotMatch(page, /<\/script><img>|style=|issuer|subject|owner_id/);
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
