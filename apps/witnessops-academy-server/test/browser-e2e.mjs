// Opt-in acceptance against disposable Keycloak/PostgreSQL. Synthetic learners only.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import pg from 'pg';
import { env, secret, int } from '../src/env.mjs';
import { createSessionTokenCodec } from '../src/session-tokens.mjs';

if (process.env.ACADEMY_E2E !== '1') {
  console.log('Academy browser acceptance skipped; requires ACADEMY_E2E=1 and disposable services.');
  process.exit(0);
}
const APP = env('ACADEMY_TEST_APP_URL', env('ACADEMY_PUBLIC_ORIGIN'));
const API = '/academy/api/lessons/report-or-evidence/draft';
const LESSON = '/academy/learn/report-or-evidence';
const EV = env('ACADEMY_TEST_EVIDENCE_DIR');
mkdirSync(EV, { recursive: true });
const users = [
  [env('TEST_LEARNER_A_USERNAME'), secret('TEST_LEARNER_A_PASSWORD')],
  [env('TEST_LEARNER_B_USERNAME'), secret('TEST_LEARNER_B_PASSWORD')],
];
const ring = JSON.parse(secret('ACADEMY_TOKEN_KEYRING'));
const tokenContext = { issuer: env('ACADEMY_OIDC_ISSUER').replace(/\/$/, ''), clientId: env('ACADEMY_OIDC_CLIENT_ID', 'academy-app') };
const codec = createSessionTokenCodec(JSON.stringify(ring), tokenContext);
const results = [];
let stage = 'startup';
let browser;
const launch = () => chromium.launch({ headless: true, ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}) });
const db = new pg.Client({ host: env('ACADEMY_DB_HOST'), port: int('ACADEMY_DB_PORT', 5432), database: env('ACADEMY_DB_NAME'), user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: secret('ACADEMY_TEST_PGADMIN_PASSWORD') });
const pass = name => { results.push({ name, result: 'PASS' }); console.log(`PASS A4 ${name}`); };
async function signedIn(index, prepare) {
  const context = await browser.newContext();
  if (prepare) await prepare(context);
  const page = await context.newPage();
  await page.goto(APP + '/lessons/report-or-evidence/');
  await expect(page).toHaveURL(APP + LESSON);
  await page.locator('#sign-in').click();
  await page.locator('#username').fill(users[index][0]);
  await page.locator('#password').fill(users[index][1]);
  // Intercepted draft loads may intentionally remain pending after navigation.
  await page.locator('#kc-login').click({ noWaitAfter: Boolean(prepare) });
  await expect(page).toHaveURL(APP + LESSON);
  if (!prepare) await expect(page.locator('#progress-status')).toContainText(/loaded|No saved work/);
  return { context, page };
}
async function save(page) {
  await page.locator('#save-progress').click();
  await expect(page.locator('#progress-status')).toContainText(/^Saved \(v/);
}
async function draft(page) {
  const response = await page.request.get(APP + API);
  assert.equal(response.status(), 200);
  return response.json();
}
async function sessionRow(context) {
  const cookie = (await context.cookies()).find(c => c.name === 'academy_sid' || c.name === '__Host-academy_sid');
  const hash = crypto.createHash('sha256').update(cookie.value).digest('hex');
  return (await db.query('SELECT * FROM academy_sessions WHERE token_hash=$1', [hash])).rows[0];
}
async function put(page, body) {
  return page.evaluate(async ({ api, body }) => {
    const token = JSON.parse(document.querySelector('#academy-csrf').textContent);
    const response = await fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { api: API, body });
}
try {
  await db.connect();
  browser = await launch();
  stage = 'real lesson and partial save';
  let a = await signedIn(0);
  if (await a.page.locator('#other-draft').isVisible()) {
    a.page.once('dialog', dialog => dialog.accept());
    await a.page.locator('#replace-draft').click();
  }
  // Start this browser scenario with a partial edit, independently of HTTP fixture content.
  await a.page.evaluate(async () => (await import('/lesson.mjs')).clearPageState());
  await expect(a.page.locator('h1')).toHaveText('Report or evidence?');
  await expect(a.page.getByRole('heading', { name: 'Watch Docs do it' })).toBeVisible();
  const partial = 'Synthetic A: log ended at 02:07:51 UTC. <img src=x onerror=alert(1)>';
  await a.page.locator('[name="claim-1"][value="Evidenced"]').check();
  await a.page.locator('#reason-1').fill(partial);
  await save(a.page);
  const partialDraft = await draft(a.page);
  assert.equal(JSON.parse(partialDraft.content).claims[0].reason, partial);
  assert.equal(JSON.parse(partialDraft.content).claims[1].label, null);
  await browser.close(); // All browser contexts/cookies gone. No storageState reuse.
  browser = await launch();
  a = await signedIn(0);
  await expect(a.page.locator('#reason-1')).toHaveValue(partial);
  assert.equal((await draft(a.page)).content, partialDraft.content);
  pass('partial real lesson survives browser close and fresh login');

  stage = 'feedback and earlier attempts';
  await a.page.locator('[name="claim-2"][value="Contradicted"]').check();
  await a.page.locator('#reason-2').fill('Synthetic B lists two databases.');
  await a.page.locator('[name="claim-3"][value="Only claimed"]').check();
  await a.page.locator('#reason-3').fill('Synthetic C supplies no restore log.');
  await a.page.locator('#honest-limit').fill('These records do not show a successful restore.');
  await a.page.locator('#teacher-reply').fill('Synthetic feedback: keep the source and scope precise.');
  await a.page.locator('#start-retry').click();
  await a.page.locator('#teacher-reply').fill('Synthetic current feedback.');
  await save(a.page);
  await a.page.reload();
  await expect(a.page.locator('#progress-status')).toContainText('loaded');
  await expect(a.page.locator('#attempt-label')).toContainText('Attempt 2');
  await expect(a.page.locator('#teacher-reply')).toHaveValue('Synthetic current feedback.');
  await expect(a.page.locator('#attempt-history details')).toHaveCount(1);
  await a.page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await a.page.setViewportSize({ width: 1280, height: 900 });
  await a.page.screenshot({ path: join(EV, 'a4-synthetic-lesson.png'), fullPage: true });
  pass('feedback, earlier attempts, reload and mobile layout');

  stage = 'two learner isolation';
  const b = await signedIn(1);
  await expect(b.page.locator('#reason-1')).not.toHaveValue(partial);
  const owner = (await db.query('SELECT owner_id FROM academy_lesson_drafts WHERE content=$1', [(await draft(a.page)).content])).rows[0].owner_id;
  const ownerQuery = await b.page.request.get(APP + API + '?owner_id=' + owner);
  assert.ok([200, 404].includes(ownerQuery.status()));
  if (ownerQuery.status() === 200) assert.notEqual((await ownerQuery.json()).content, (await draft(a.page)).content);
  const forged = await put(b.page, { owner_id: owner, content: 'forged synthetic content', expected_version: 0, save_request_id: crypto.randomUUID() });
  assert.equal(forged.status, 400);
  await b.page.locator('#reason-1').fill('Synthetic learner B owns this answer.');
  await save(b.page);
  await expect(a.page.locator('#reason-1')).toHaveValue(partial);
  assert.equal(JSON.parse((await draft(a.page)).content).claims[0].reason, partial);
  pass('two synthetic learners own separate records; forged owner rejected');

  stage = 'encrypted tokens, rotation and refresh';
  let sealedRow = await sessionRow(a.context);
  assert.ok(sealedRow.id_token === null && sealedRow.access_token === null && sealedRow.refresh_token === null);
  const opened = codec.open(sealedRow.tokens_ciphertext, sealedRow);
  assert.ok(Boolean(opened.tokens.id_token && opened.tokens.access_token && opened.tokens.refresh_token));
  const previous = Object.keys(ring.keys).find(id => id !== ring.active);
  assert.ok(previous);
  const previousCodec = createSessionTokenCodec(JSON.stringify({ ...ring, active: previous }), tokenContext);
  await db.query('UPDATE academy_sessions SET tokens_ciphertext=$2 WHERE token_hash=$1', [sealedRow.token_hash, previousCodec.seal(opened.tokens, sealedRow)]);
  assert.equal((await a.page.request.get(APP + API)).status(), 200);
  sealedRow = await sessionRow(a.context);
  assert.ok(sealedRow.tokens_ciphertext.startsWith('v1.' + ring.active + '.'));
  const forRefresh = codec.open(sealedRow.tokens_ciphertext, sealedRow).tokens;
  await db.query('UPDATE academy_sessions SET tokens_ciphertext=$2 WHERE token_hash=$1', [sealedRow.token_hash, codec.seal({ ...forRefresh, access_token: 'synthetic-invalid' }, sealedRow)]);
  assert.equal((await a.page.request.get(APP + API)).status(), 200);
  sealedRow = await sessionRow(a.context);
  assert.ok(sealedRow.id_token === null && sealedRow.access_token === null && sealedRow.refresh_token === null);
  assert.ok(codec.open(sealedRow.tokens_ciphertext, sealedRow).tokens.access_token !== 'synthetic-invalid');
  pass('A3 tokens sealed at rest; retained-key rewrap and real Keycloak refresh stay encrypted');

  stage = 'concurrent tabs';
  const stale = await a.context.newPage();
  await stale.goto(APP + LESSON);
  await expect(stale.locator('#progress-status')).toContainText('loaded');
  await a.page.locator('#reason-1').fill('Synthetic A newer version.');
  await save(a.page);
  await stale.locator('#reason-1').fill('Synthetic stale edit stays available to copy.');
  await stale.locator('#save-progress').click();
  await expect(stale.locator('#progress-status')).toContainText('Saved elsewhere');
  await expect(stale.locator('#save-progress')).toBeDisabled();
  await expect(stale.locator('#reason-1')).toHaveValue('Synthetic stale edit stays available to copy.');
  assert.equal(JSON.parse((await draft(a.page)).content).claims[0].reason, 'Synthetic A newer version.');
  await stale.close({ runBeforeUnload: false });
  pass('optimistic concurrency preserves newer saved work and stale local edits');

  stage = 'uncertain network save';
  const beforeRetry = await draft(a.page);
  let intercepted = false;
  await a.page.route('**' + API, async route => {
    if (route.request().method() === 'PUT' && !intercepted) {
      intercepted = true;
      await route.fetch(); // Commit succeeds; drop only the response to the browser.
      await route.abort('failed');
    } else await route.continue();
  });
  await a.page.locator('#reason-1').fill('Synthetic response-loss retry.');
  await a.page.locator('#save-progress').click();
  await expect(a.page.locator('#progress-status')).toContainText('Save not confirmed');
  await save(a.page);
  const afterRetry = await draft(a.page);
  assert.equal(afterRetry.version, beforeRetry.version + 1);
  await a.page.unroute('**' + API);
  pass('lost save response retries the same request without duplicate version');

  stage = 'load failure';
  const blocked = await signedIn(0, async ctx => ctx.route('**' + API, route => route.request().method() === 'GET' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"synthetic_unavailable"}' }) : route.continue()));
  await expect(blocked.page.locator('#progress-status')).toContainText('could not be loaded');
  await expect(blocked.page.locator('#reason-1')).toBeDisabled();
  await expect(blocked.page.locator('#save-progress')).toBeDisabled();
  await blocked.context.unroute('**' + API);
  await blocked.page.locator('#retry-load').click();
  await expect(blocked.page.locator('#progress-status')).toContainText('loaded');
  await blocked.context.close();
  pass('load failure blocks editing and recovers through explicit retry');

  stage = 'unknown saved text';
  const raw = '<script>synthetic learner text, never executable</script>';
  const now = await draft(a.page);
  assert.equal((await put(a.page, { content: raw, expected_version: now.version, save_request_id: crypto.randomUUID() })).status, 200);
  await a.page.reload();
  await expect(a.page.locator('#saved-text')).toHaveValue(raw);
  await expect(a.page.locator('#reason-1')).toBeDisabled();
  assert.equal((await draft(a.page)).content, raw);
  a.page.once('dialog', dialog => dialog.accept());
  await a.page.locator('#replace-draft').click();
  await a.page.locator('#reason-1').fill('Synthetic explicit replacement.');
  await save(a.page);
  pass('unknown or MCP text is preserved until explicit replacement');

  stage = 'multiline legacy draft preservation';
  const multiline = JSON.stringify({ claims: [{ label: 'Evidenced', reason: 'Synthetic first line\r\nSecond line' }, {}, {}], limit: '' });
  const beforeMultiline = await draft(a.page);
  assert.equal((await put(a.page, { content: multiline, expected_version: beforeMultiline.version, save_request_id: crypto.randomUUID() })).status, 200);
  await a.page.reload();
  await expect(a.page.locator('#saved-text')).toHaveValue(multiline);
  await expect(a.page.locator('#other-draft')).toBeVisible();
  await expect(a.page.locator('#reason-1')).toBeDisabled();
  assert.equal((await draft(a.page)).content, multiline);
  a.page.once('dialog', dialog => dialog.accept());
  await a.page.locator('#replace-draft').click();
  await a.page.locator('#reason-1').fill('Synthetic explicit replacement.');
  await save(a.page);
  pass('multiline legacy reasons stay intact in raw view until explicit replacement');

  for (const boundary of ['logout', 'pagehide']) {
    stage = 'delayed draft load after ' + boundary;
    let release, captured = false, interceptedLoad = false;
    const held = new Promise(resolve => { release = resolve; });
    const delayed = await signedIn(0, async ctx => ctx.route('**' + API, async route => {
      if (route.request().method() !== 'GET' || interceptedLoad) return route.continue();
      interceptedLoad = true;
      const original = await route.fetch();
      captured = true;
      await held;
      await route.fulfill({ response: original });
    }));
    try {
      await expect.poll(() => captured).toBe(true);
      if (boundary === 'logout') {
        await delayed.page.locator('#sign-out').click();
        await expect(delayed.page.locator('#progress-status')).toContainText('Signed out');
      } else {
        await delayed.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      }
      const endedStatus = await delayed.page.locator('#progress-status').textContent();
      const stale = delayed.page.waitForResponse(r => r.url() === APP + API && r.request().method() === 'GET');
      release();
      await stale;
      await delayed.page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      await expect(delayed.page.locator('#reason-1')).toHaveValue('');
      await expect(delayed.page.locator('#reason-1')).toBeDisabled();
      await expect(delayed.page.locator('#save-progress')).toBeHidden();
      await expect(delayed.page.locator('#progress-status')).toHaveText(endedStatus);
      if (boundary === 'logout') assert.equal((await delayed.page.request.get(APP + API)).status(), 401);
      else {
        await delayed.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        await expect(delayed.page.locator('#progress-status')).toContainText('loaded');
        await expect(delayed.page.locator('#reason-1')).toHaveValue('Synthetic explicit replacement.');
      }
      pass('delayed draft cannot restore or unlock work after ' + boundary);
    } finally {
      release();
      await delayed.context.close();
    }
  }

  for (const report of ['pending', 'failed']) {
    stage = 'local logout with IdP ' + report;
    const incomplete = await signedIn(0);
    await incomplete.page.route('**/academy/auth/logout', async route => {
      const actual = await route.fetch(); // Revoke the real disposable local session.
      assert.equal(actual.status(), 200);
      await route.fulfill({ response: actual, status: 502, contentType: 'application/json',
        body: JSON.stringify({ ok: false, idp_logout: report }) });
    });
    await incomplete.page.locator('#sign-out').click();
    await expect(incomplete.page.locator('#progress-status')).toContainText('Signed out of Academy');
    await expect(incomplete.page.locator('#progress-status')).toContainText('incomplete');
    await expect(incomplete.page.locator('#reason-1')).toHaveValue('');
    await expect(incomplete.page.locator('#reason-1')).toBeDisabled();
    await expect(incomplete.page.locator('#sign-in')).toBeVisible();
    assert.equal((await incomplete.page.request.get(APP + API)).status(), 401);
    await incomplete.context.close();
    pass('local logout clears work when the synthetic IdP report is ' + report);
  }

  stage = 'logout and return';
  const saved = await draft(a.page);
  await a.page.locator('#sign-out').click();
  await expect(a.page.locator('#progress-status')).toContainText('Signed out');
  await expect(a.page.locator('#reason-1')).toHaveValue('');
  assert.equal((await a.page.request.get(APP + API)).status(), 401);
  await a.context.close();
  a = await signedIn(0);
  assert.equal((await draft(a.page)).content, saved.content);
  await expect(a.page.locator('#reason-1')).toHaveValue('Synthetic explicit replacement.');
  pass('logout revokes access and fresh login returns the same saved work');

  stage = 'session expiry';
  const cookie = (await a.context.cookies()).find(c => c.name === 'academy_sid' || c.name === '__Host-academy_sid');
  await db.query("UPDATE academy_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [crypto.createHash('sha256').update(cookie.value).digest('hex')]);
  await a.page.locator('#reason-1').fill('Synthetic expired session edit.');
  await a.page.locator('#save-progress').click();
  await expect(a.page.locator('#progress-status')).toContainText('session ended');
  await expect(a.page.locator('#reason-1')).toHaveValue('');
  await expect(a.page.locator('#sign-in')).toBeVisible();
  assert.equal((await b.page.request.get(APP + API)).status(), 200);
  pass('expired session clears local work and denies saving; other learner unaffected');

  stage = 'encrypted token tampering and cross-session substitution';
  const bound = await signedIn(0);
  let boundRow = await sessionRow(bound.context);
  const bRow = await sessionRow(b.context);
  await db.query('UPDATE academy_sessions SET tokens_ciphertext=$2 WHERE token_hash=$1', [boundRow.token_hash, bRow.tokens_ciphertext]);
  assert.equal((await bound.page.request.get(APP + API)).status(), 401);
  boundRow = await sessionRow(bound.context);
  assert.ok(boundRow.revoked_at && boundRow.tokens_ciphertext === null);
  assert.equal((await b.page.request.get(APP + API)).status(), 200);
  await bound.context.close();
  const tampered = await signedIn(0);
  let tamperedRow = await sessionRow(tampered.context);
  const parts = tamperedRow.tokens_ciphertext.split('.');
  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  await db.query('UPDATE academy_sessions SET tokens_ciphertext=$2 WHERE token_hash=$1', [tamperedRow.token_hash, parts.join('.')]);
  assert.equal((await tampered.page.request.get(APP + API)).status(), 401);
  tamperedRow = await sessionRow(tampered.context);
  assert.ok(tamperedRow.revoked_at && tamperedRow.tokens_ciphertext === null);
  await tampered.context.close();
  pass('A3 ciphertext tampering and cross-learner bundle substitution fail closed');

} catch (error) {
  let detail = String(error.message || error.name);
  for (const value of [users[0][1], users[1][1], secret('ACADEMY_TEST_PGADMIN_PASSWORD')]) detail = detail.split(value).join('[REDACTED]');
  detail = detail.replace(/https?:\/\/[^\s]+/g, '[URL]').replace(/[A-Za-z0-9_-]{40,}/g, '[LONG_VALUE]');
  console.error(detail.slice(0, 1200));
  results.push({ name: stage, result: 'FAIL' });
  console.error(`FAIL A4 ${stage} (details intentionally omit credentials and tokens)`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await db.end();
  mkdirSync(EV, { recursive: true });
  writeFileSync(join(EV, 'a4-browser-results.json'), JSON.stringify({ results, boundary: 'Disposable synthetic environment only; no production acceptance.' }, null, 2));
}
console.log(`RESULT: A4 ${results.filter(r => r.result === 'PASS').length}/${results.length} PASS`);
