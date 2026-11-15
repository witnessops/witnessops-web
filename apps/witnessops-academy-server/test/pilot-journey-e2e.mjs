// Real Keycloak/PostgreSQL/browser acceptance, only in the dedicated disposable lab.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { chromium, expect } from '@playwright/test';
import { env, secret, int } from '../src/env.mjs';
import { createInvitationBatch, revokeInvitation, revokeFreeGrant, renderCapturedInvitationEmail } from '../src/pilot-invitations.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_INVITATIONS_DISPOSABLE !== '1') throw new Error('Explicit disposable invitation journey required');
const APP = env('ACADEMY_TEST_APP_URL');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(APP).hostname)) throw new Error('Loopback synthetic journey only');
const EV = env('ACADEMY_TEST_EVIDENCE_DIR');
mkdirSync(EV, { recursive: true });
const users = [
  [env('TEST_LEARNER_A_USERNAME'), secret('TEST_LEARNER_A_PASSWORD')],
  [env('TEST_LEARNER_B_USERNAME'), secret('TEST_LEARNER_B_PASSWORD')],
];
const db = new pg.Pool({ host: env('ACADEMY_DB_HOST'), port: int('ACADEMY_DB_PORT', 5432),
  database: env('ACADEMY_DB_NAME'), user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: secret('ACADEMY_TEST_PGADMIN_PASSWORD') });
const results = [];
const pass = name => { results.push({ name, result: 'PASS' }); console.log('PASS pilot ' + name); };
const launch = () => chromium.launch({ headless: true,
  ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}),
  args: process.env.ACADEMY_TEST_CERT_SPKI_ARG ? [process.env.ACADEMY_TEST_CERT_SPKI_ARG] : [] });
let browser;
const refs = { approvalReference: 'synthetic-owner-approved-initial-free-pilot', administratorReference: 'synthetic-authorized-administrator' };
async function login(index, invitationToken) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(APP + '/academy/invitation' + (invitationToken ? '#token=' + invitationToken : ''));
  assert.equal(new URL(page.url()).hash, '', 'private invitation fragment must be cleared before sign-in');
  await page.locator(invitationToken ? '#accept-invitation' : '#sign-in').click();
  await page.locator('#username').fill(users[index][0]);
  await page.locator('#password').fill(users[index][1]);
  await page.locator('#kc-login').click();
  await expect(page.locator('#sign-out')).toBeVisible();
  const cookie = (await context.cookies()).find(c => c.name.endsWith('academy_sid'));
  assert.ok(cookie);
  const row = (await db.query('SELECT identity_id FROM academy_sessions WHERE token_hash=$1',
    [crypto.createHash('sha256').update(cookie.value).digest('hex')])).rows[0];
  const identity = (await db.query('SELECT id, issuer, subject FROM academy_identities WHERE id=$1', [row.identity_id])).rows[0];
  return { context, page, identity };
}
async function api(page, lessonId) {
  const response = await page.request.get(APP + `/academy/api/lessons/${lessonId}/draft`);
  return { status: response.status(), body: await response.json() };
}
async function post(page, action, body) {
  return page.evaluate(async ({ action, body }) => {
    const csrf = JSON.parse(document.querySelector('#academy-csrf').textContent);
    const response = await fetch('/academy/api/invitations/' + action, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { action, body });
}
async function exportCommunityState(filename) {
  const rows = (await db.query(`SELECT i.id AS "identityId", i.issuer, i.subject,
    g.course_id AS "courseId", g.access_kind AS "accessKind", g.role,
    (g.revoked_at IS NOT NULL) AS revoked
    FROM academy_pilot_grants g JOIN academy_identities i ON i.id=g.identity_id
    ORDER BY i.id`)).rows;
  writeFileSync(join(EV, filename), JSON.stringify({ source: 'actual disposable Academy PostgreSQL grants', rows }, null, 2));
}
const recipient = identity => ({ issuer: identity.issuer, subject: identity.subject });
async function invite(identity, expiresInSeconds) {
  return (await createInvitationBatch(db, { ...refs, recipients: [recipient(identity)], ...(expiresInSeconds ? { expiresInSeconds } : {}) })).invitations[0];
}
try {
  browser = await launch();
  let a = await login(0), b = await login(1);
  for (const learner of [a, b]) {
    assert.equal((await api(learner.page, 'report-or-evidence')).status, 403);
    assert.equal((await api(learner.page, 'same-scope')).status, 403);
    await expect(learner.page.locator('#invitation-status')).toContainText('Sign-in alone does not grant access');
  }
  const original = (await db.query('SELECT owner_id, lesson_id, content, version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id', [[a.identity.id, b.identity.id]])).rows;
  pass('sign-in without a grant denies both protected lessons and draft endpoints');

  const revoked = await invite(a.identity);
  await revokeInvitation(db, { invitationId: revoked.invitationId, administratorReference: refs.administratorReference });
  assert.equal((await post(a.page, 'redeem', { token: revoked.token })).status, 403);
  const expired = await invite(a.identity, 1);
  // Wait for the real database clock; never change a real host clock or expiry policy.
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal((await post(a.page, 'redeem', { token: expired.token })).status, 403);
  pass('revoked and expired invitation links deny grant creation');

  const invitations = (await createInvitationBatch(db, { ...refs, recipients: [recipient(a.identity), recipient(b.identity)] })).invitations;
  const [inviteA, inviteB] = invitations;
  const mail = renderCapturedInvitationEmail({ token: inviteA.token, academyOrigin: APP, recipientEmail: 'learner-a@example.invalid' });
  assert.equal(mail.captured, true);
  assert.ok(mail.text.includes('#token='));
  assert.ok(!mail.text.includes('?token='));
  writeFileSync(join(EV, 'captured-invitation-sanitized.json'), JSON.stringify({ ...mail, text: mail.text.replaceAll(inviteA.token, '[REDACTED]') }, null, 2));
  assert.equal((await post(b.page, 'preview', { token: inviteA.token })).status, 403);
  assert.equal((await post(b.page, 'redeem', { token: inviteA.token, owner_id: a.identity.id })).status, 400);
  const crossOrigin = await a.page.request.post(APP + '/academy/api/invitations/redeem', {
    headers: { Origin: 'https://outsider.example.invalid', 'Content-Type': 'application/json' }, data: { token: inviteA.token } });
  assert.equal(crossOrigin.status(), 403);
  pass('captured email uses a private fragment; wrong account, forged owner and foreign Origin cannot accept');

  await a.context.close(); await b.context.close();
  // A wrong-account callback must not consume the invitation or grant its recipient access.
  b = await login(1, inviteA.token);
  await expect(b.page).toHaveURL(APP + '/academy/invitation');
  await expect(b.page.locator('#invitation-status')).toContainText('Invitation not accepted');
  assert.equal((await api(b.page, 'report-or-evidence')).status, 403);
  await b.context.close();
  a = await login(0, inviteA.token);
  await expect(a.page).toHaveURL(APP + '/academy/learn/report-or-evidence');
  await expect(a.page.locator('#progress-status')).toContainText(/loaded|No saved work/);
  assert.equal((await api(a.page, 'report-or-evidence')).status, 200);
  b = await login(1);
  await b.page.goto(APP + '/academy/invitation#token=' + inviteB.token);
  await expect(b.page.locator('#invitation-status')).toContainText('This account can accept');
  await b.page.locator('#accept-invitation').click();
  await expect(b.page).toHaveURL(APP + '/academy/learn/report-or-evidence');
  await expect(b.page.locator('#progress-status')).toContainText(/loaded|No saved work/);
  await exportCommunityState('community-grants-active.json');
  pass('correct-account fresh login and existing-session acceptance create their explicit free grants');
  const retained = (await db.query('SELECT owner_id, lesson_id, content, version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id', [[a.identity.id, b.identity.id]])).rows;
  assert.deepEqual(retained, original);
  assert.equal((await post(a.page, 'redeem', { token: inviteA.token })).status, 403);
  pass('invitation redemption preserves all earlier work and a used link cannot create another grant');

  const saved = [];
  for (const [index, learner] of [a, b].entries()) {
    await learner.page.goto(APP + '/academy/learn/same-scope');
    await expect(learner.page.locator('#progress-status')).toContainText(/loaded|No saved work/);
    if (await learner.page.locator('#other-draft').isVisible()) {
      learner.page.once('dialog', dialog => dialog.accept()); await learner.page.locator('#replace-draft').click();
    }
    await learner.page.locator('#reason-1').fill(`Synthetic pilot learner ${index}: stored in production. <img src=x onerror=alert(1)>`);
    await learner.page.locator('#teacher-reply').fill('Synthetic feedback retained only as learner work.');
    await learner.page.locator('#save-progress').click();
    await expect(learner.page.locator('#progress-status')).toContainText(/^Saved/);
    saved.push((await api(learner.page, 'same-scope')).body.content);
    await learner.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await learner.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.equal(await learner.page.locator('#lesson-form img').count(), 0);
  }
  assert.notEqual(saved[0], saved[1]);
  await a.page.screenshot({ path: join(EV, 'pilot-mobile.png'), fullPage: true });
  pass('both approved learners save separate second-lesson work with safe rendering and mobile layout');

  await browser.close();
  execFileSync(env('ACADEMY_TEST_RESTART_APP_CMD'), [env('ACADEMY_DB_NAME')], { env: process.env, stdio: 'pipe' });
  browser = await launch();
  a = await login(0); b = await login(1);
  for (const [index, learner] of [a, b].entries()) {
    await learner.page.goto(APP + '/academy/learn/same-scope');
    await expect(learner.page.locator('#progress-status')).toContainText('loaded');
    assert.equal((await api(learner.page, 'same-scope')).body.content, saved[index]);
  }
  await a.page.setViewportSize({ width: 1280, height: 900 });
  await a.page.screenshot({ path: join(EV, 'pilot-desktop.png'), fullPage: true });
  pass('browser closure, application restart and fresh logins retain grants and separate saved work');

  await revokeFreeGrant(db, { identityId: b.identity.id, administratorReference: refs.administratorReference });
  assert.equal((await api(b.page, 'same-scope')).status, 403);
  assert.equal((await b.page.request.put(APP + '/academy/api/lessons/same-scope/draft', { data: { content: 'forged', expected_version: 1 } })).status(), 403);
  assert.equal((await b.page.request.get(APP + '/academy/learn/same-scope')).status(), 403);
  assert.equal((await api(a.page, 'same-scope')).status, 200);
  assert.equal((await db.query("SELECT content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id='same-scope'", [b.identity.id])).rows[0].content, saved[1]);
  await exportCommunityState('community-grants-revoked.json');
  pass('owner revocation denies reads, writes and lessons immediately while preserving work and the other learner');

  const newUsername = 'learner-new-' + crypto.randomUUID();
  const created = JSON.parse(execFileSync('python3', [env('ACADEMY_TEST_KC_ADMIN', fileURLToPath(new URL('../keycloak/kc_admin.py', import.meta.url))), 'create-test-invitee', newUsername], { env: process.env, encoding: 'utf8' }));
  const newRecipient = { issuer: a.identity.issuer, subject: created.subject };
  assert.equal((await db.query('SELECT 1 FROM academy_identities WHERE issuer=$1 AND subject=$2', [newRecipient.issuer, newRecipient.subject])).rowCount, 0);
  const newInvitation = (await createInvitationBatch(db, { ...refs, recipients: [newRecipient] })).invitations[0];
  users.push([newUsername, users[1][1]]);
  let firstUse = await login(2, newInvitation.token);
  await expect(firstUse.page.locator('#progress-status')).toContainText('No saved work');
  assert.equal(firstUse.identity.subject, created.subject);
  assert.equal((await api(firstUse.page, 'report-or-evidence')).status, 404);
  await firstUse.page.locator('#reason-1').fill('Synthetic first-ever learner work.');
  await firstUse.page.locator('#save-progress').click();
  await expect(firstUse.page.locator('#progress-status')).toContainText(/^Saved/);
  const firstWork = (await api(firstUse.page, 'report-or-evidence')).body.content;
  await firstUse.context.close();
  firstUse = await login(2);
  await expect(firstUse.page.locator('#progress-status')).toContainText('loaded');
  assert.equal((await api(firstUse.page, 'report-or-evidence')).body.content, firstWork);
  pass('first-ever Academy callback creates the invited stable identity and grant, then a fresh login restores new work');

} finally {
  if (browser) await browser.close();
  await db.end();
  writeFileSync(join(EV, 'pilot-journey-results.json'), JSON.stringify({ scope: 'disposable Keycloak/PostgreSQL/browser', results, community: 'NOT_INCLUDED', paidCheckout: 'NOT_INCLUDED' }, null, 2));
}
console.log(`RESULT pilot ${results.length}/9 PASS`);
if (results.length !== 9) process.exitCode = 1;
