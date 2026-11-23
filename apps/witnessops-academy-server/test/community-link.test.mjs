import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { communityUrl } from '../src/community-link.mjs';
import { lessonPage } from '../src/lesson-page.mjs';
import { invitationPage } from '../src/invitation-page.mjs';
const html = readFileSync(new URL('../../witnessops-academy/public/lessons/report-or-evidence/index.html', import.meta.url), 'utf8');
test('community navigation rejects token-bearing, credential-bearing and unsafe destinations', () => {
  assert.equal(communityUrl(), null);
  assert.equal(communityUrl('https://community.example.invalid'), 'https://community.example.invalid/');
  assert.equal(communityUrl('http://127.0.0.1:19543'), 'http://127.0.0.1:19543/');
  for (const value of ['javascript:alert(1)', '//example.invalid', 'http://example.invalid', 'https://a:b@example.invalid', 'https://example.invalid/?token=secret', 'https://example.invalid/#session=secret']) assert.throws(() => communityUrl(value));
});
test('only a signed-in lesson renders configured community navigation without forwarding a session', () => {
  const url = communityUrl('https://community.example.invalid');
  assert.doesNotMatch(lessonPage(html, null, undefined, url), /id="community-link"/);
  assert.doesNotMatch(lessonPage(html, { csrf_token: 'synthetic' }), /id="community-link"/);
  const page = lessonPage(html, { csrf_token: 'synthetic' }, undefined, url);
  assert.match(page, /id="community-link"[^>]+href="https:\/\/community.example.invalid\/"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
  assert.doesNotMatch(page, /community.example.invalid[^"<]*synthetic/);
});

test('signed-in invitation and admission pages keep community navigation separate from course access', () => {
  const url = communityUrl('https://community.example.invalid');
  const session = { csrf_token: 'synthetic-csrf', identity_id: 'synthetic-identity', access_token: 'synthetic-bearer' };
  for (const state of [{}, { denied: true }, { failed: true }]) {
    const page = invitationPage(session, { ...state, communityUrl: url });
    const link = page.match(/<a id="community-link"[^>]*>[^<]*<\/a>/)?.[0];
    assert.ok(link);
    assert.equal((page.match(/id="community-link"/g) || []).length, 1);
    assert.match(link, /href="https:\/\/community\.example\.invalid\/"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
    assert.doesNotMatch(link, /synthetic-(?:csrf|identity|bearer)/);
    assert.match(page, /does not grant administrative rights or community membership/);
    if (state.denied) assert.match(page, /You need an owner-approved pilot place to use saved lessons/);
  }
});
test('invitation and admission pages omit community navigation when signed out or unconfigured', () => {
  const url = communityUrl('https://community.example.invalid');
  for (const state of [{}, { denied: true }, { failed: true }]) {
    assert.doesNotMatch(invitationPage(null, { ...state, communityUrl: url }), /id="community-link"|community\.example\.invalid/);
    assert.doesNotMatch(invitationPage({ csrf_token: 'synthetic' }, state), /id="community-link"/);
  }
});
