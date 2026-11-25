// Opt-in real Chromium/Keycloak/PostgreSQL acceptance. The lesson cases are
// simulated; browser actions, authentication and persistence use the CI services.
// Run sequentially after chat MCP acceptance, before the approved-free profile.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, secret, int } from '../src/env.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_CHAT_DISPOSABLE !== '1') {
  throw new Error('Explicit disposable chat browser acceptance required: ACADEMY_E2E=1 and ACADEMY_CHAT_DISPOSABLE=1');
}
if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Chat browser acceptance requires the Node 22 CI runtime');
const loopback = value => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(value);
const appUrl = new URL(env('ACADEMY_TEST_APP_URL'));
const issuerUrl = new URL(env('ACADEMY_OIDC_ISSUER'));
if (!loopback(appUrl.hostname) || !['http:', 'https:'].includes(appUrl.protocol)
    || appUrl.pathname !== '/' || appUrl.search || appUrl.hash || appUrl.username || appUrl.password
    || new URL(env('ACADEMY_PUBLIC_ORIGIN')).origin !== appUrl.origin
    || !loopback(issuerUrl.hostname) || !['http:', 'https:'].includes(issuerUrl.protocol)
    || issuerUrl.username || issuerUrl.password || issuerUrl.search || issuerUrl.hash
    || !loopback(env('ACADEMY_DB_HOST'))) throw new Error('Loopback disposable app, identity and database services required');
if (env('ACADEMY_ACCESS_POLICY') !== 'session-only') throw new Error('Run before the CI fixture changes to approved-free-pilot');
const usernames = [env('TEST_LEARNER_A_USERNAME'), env('TEST_LEARNER_B_USERNAME')];
if (usernames[0] !== 'learner-a' || usernames[1] !== 'learner-b') throw new Error('Only the two fixed disposable CI learners may run this acceptance');
const APP = appUrl.origin;
const DB_NAME = env('ACADEMY_DB_NAME');
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(DB_NAME)) throw new Error('Invalid disposable database name');
const RESTART = realpathSync(env('ACADEMY_TEST_RESTART_APP_CMD'));
if (RESTART !== realpathSync(fileURLToPath(new URL('./restart-app.sh', import.meta.url)))) throw new Error('Only the checked-in disposable application restart helper is permitted');
if (realpathSync(env('ACADEMY_SERVER_ROOT')) !== realpathSync(fileURLToPath(new URL('..', import.meta.url)))) throw new Error('Restart source must be this Academy server checkout');
const EV = env('ACADEMY_TEST_EVIDENCE_DIR');
if (!isAbsolute(EV)) throw new Error('An absolute disposable evidence directory is required');
mkdirSync(EV, { recursive: true, mode: 0o700 });

const [{ chromium, expect: baseExpect }, { default: pg }] = await Promise.all([import('@playwright/test'), import('pg')]);
const expect = baseExpect.configure({ timeout: 15_000 });
const passwords = [secret('TEST_LEARNER_A_PASSWORD'), secret('TEST_LEARNER_B_PASSWORD')];
const databasePassword = secret('ACADEMY_TEST_PGADMIN_PASSWORD');
const db = new pg.Client({ host: env('ACADEMY_DB_HOST'), port: int('ACADEMY_DB_PORT', 5432),
  database: DB_NAME, user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: databasePassword,
  connectionTimeoutMillis: 5000, statement_timeout: 5000, query_timeout: 10_000 });
const lessons = ['report-or-evidence', 'same-scope'];
const routeFor = id => `/academy/learn/${id}`;
const apiFor = id => `/academy/api/lessons/${id}/chat`;
const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const results = [];
const screenshots = [];
const pageErrors = [];
const snapshots = new Map();
const startedAt = new Date().toISOString();
let stage = 'disposable startup';
let browser;
let browserVersion;
let connected = false;
let learners = [];

function pass(name, evidence = {}) {
  results.push({ name, result: 'PASS', observed_at: new Date().toISOString(), ...evidence });
  console.log(`PASS chat browser ${name}`);
}
function sanitize(error) {
  let message = String(error?.message || error?.name || 'Acceptance failed');
  for (const value of [...passwords, databasePassword]) message = message.split(value).join('[REDACTED]');
  return message.replace(/https?:\/\/[^\s]+/g, '[URL]').replace(/[A-Za-z0-9_-]{40,}/g, '[LONG_VALUE]').slice(0, 1000);
}
async function launch() {
  browser = await chromium.launch({ headless: true,
    ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}) });
  browserVersion = browser.version();
}
async function closeBrowser() {
  if (browser) { const closing = browser; browser = null; await closing.close(); }
}
function stable(view) {
  return { lesson_id: view.lesson_id, lesson_version: view.lesson_version, attempt_id: view.attempt_id,
    version: view.version, stage: view.stage, status: view.status, coached: view.coached,
    progress: view.progress, messages: view.messages, prompt: view.prompt, choices: view.choices,
    decision_record: view.decision_record ?? null };
}
function summary(view) {
  return { lesson_id: view.lesson_id, attempt_sha256: sha(view.attempt_id), version: view.version,
    stage: view.stage, status: view.status, decisions: view.messages.filter(item => item.role === 'learner').length,
    assignment_sha256: sha(view.messages[0]), transcript_sha256: sha(view.messages), coached: view.coached };
}
function checkProjection(view, lessonId) {
  assert.equal(view.lesson_id, lessonId);
  assert.equal(view.simulated, true);
  assert.equal(typeof view.attempt_id, 'string');
  assert.ok(Number.isSafeInteger(view.version) && view.version >= 1);
  assert.ok(Array.isArray(view.messages) && Array.isArray(view.choices));
  assert.equal(Object.hasOwn(view, 'seed'), false);
  assert.equal(Object.hasOwn(view, 'owner_id'), false);
  return view;
}
async function read(page, lessonId, suffix = '') {
  const response = await page.request.get(APP + apiFor(lessonId) + suffix, { timeout: 15_000 });
  return { status: response.status(), body: await response.json() };
}
async function view(page, lessonId) {
  const result = await read(page, lessonId);
  assert.equal(result.status, 200, 'Authenticated chat read must succeed');
  return checkProjection(result.body, lessonId);
}
async function owner(context) {
  const cookie = (await context.cookies()).find(item => item.name === 'academy_sid' || item.name === '__Host-academy_sid');
  assert.ok(cookie, 'Fresh login must create an Academy session');
  const result = await db.query('SELECT identity_id FROM academy_sessions WHERE token_hash=$1 AND revoked_at IS NULL', [sha(cookie.value)]);
  assert.equal(result.rowCount, 1);
  return result.rows[0].identity_id;
}
async function login(index, lessonId = lessons[0]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push({ stage, error: sanitize(error) }));
  await page.goto(APP + `/lessons/${lessonId}/`);
  await expect(page).toHaveURL(APP + routeFor(lessonId));
  await page.locator('#sign-in').click();
  await expect(page.locator('#username')).toBeVisible();
  await page.locator('#username').fill(usernames[index]);
  await page.locator('#password').fill(passwords[index]);
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(APP + routeFor(lessonId));
  await expect(page.locator('html[data-academy-authenticated]')).toBeVisible();
  await expect(page.locator('#chat-status')).toContainText(/Ready when you are|Your saved lesson is ready|Your completed exercise/);
  assert.equal(new URL(page.url()).search, '', 'The canonical lesson must open the chat, not the worksheet');
  return { index, context, page, owner: await owner(context) };
}
async function openLesson(learner, lessonId) {
  await learner.page.goto(APP + routeFor(lessonId));
  await expect(learner.page.locator('[data-chat-api]')).toHaveAttribute('data-chat-api', apiFor(lessonId));
  await expect(learner.page.locator('#chat-status')).toContainText(/Ready when you are|Your saved lesson is ready|Your completed exercise/);
}
async function start(learner, lessonId) {
  const page = learner.page;
  await expect(page.locator('#start-lesson')).toBeEnabled();
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === apiFor(lessonId) && response.request().method() === 'POST');
  await page.locator('#start-lesson').click();
  const response = await waiting;
  assert.equal(response.status(), 200, 'Actual Start click must create the assigned case');
  const result = checkProjection(await response.json(), lessonId);
  assert.equal(result.version, 1);
  assert.equal(result.stage, 'judgment');
  await expect(page.locator('#decision-panel')).toBeVisible();
  await expect(page.locator('#chat-status')).toContainText(/^Saved to your Academy account/);
  await expect(page.locator('#conversation .evidence-card')).toHaveCount(result.messages.flatMap(item => item.evidence || []).length);
  await expect(page.locator('#decision-choices input')).toHaveCount(result.choices.length);
  const row = await db.query('SELECT content, version FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [learner.owner, `chat-${lessonId}`]);
  assert.equal(row.rowCount, 1);
  assert.equal(row.rows[0].version, 1);
  assert.equal(JSON.parse(row.rows[0].content).attempt.attempt_id, result.attempt_id);
  return result;
}
async function decide(learner, lessonId, before, choiceId) {
  const page = learner.page;
  const choice = before.choices.find(item => item.id === choiceId);
  assert.ok(choice, 'The selected judgment must be offered by the current generated case');
  await page.getByRole('radio', { name: choice.label, exact: true }).check();
  await expect(page.locator('#submit-decision')).toBeEnabled();
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === apiFor(lessonId) && response.request().method() === 'POST');
  await page.locator('#submit-decision').click();
  const response = await waiting;
  assert.equal(response.status(), 200, 'Actual Submit click must persist the decision');
  const next = checkProjection(await response.json(), lessonId);
  assert.equal(next.attempt_id, before.attempt_id);
  assert.equal(next.version, before.version + 1);
  assert.equal(next.messages.filter(item => item.role === 'learner').length, before.messages.filter(item => item.role === 'learner').length + 1);
  await expect(page.locator('#conversation .learner-message')).toHaveCount(next.messages.filter(item => item.role === 'learner').length);
  await expect(page.locator('#conversation .evidence-card')).toHaveCount(next.messages.flatMap(item => item.evidence || []).length);
  if (next.status === 'completed') {
    await expect(page.locator('#lesson-complete')).toBeVisible();
    await expect(page.locator('#decision-panel')).toBeHidden();
    await expect(page.locator('#chat-status')).toContainText(/decision record is saved|completed with coaching/);
  } else {
    await expect(page.locator('#step-label')).toHaveText(`Decision ${next.progress.current} of ${next.progress.total}`);
    await expect(page.locator('#chat-status')).toContainText(/^Saved to your Academy account/);
  }
  return next;
}
async function post(page, lessonId, body) {
  return page.evaluate(async ({ api, body }) => {
    const csrf = JSON.parse(document.querySelector('#academy-csrf').textContent);
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { api: apiFor(lessonId), body });
}
function record(view, name) {
  const found = view.messages.flatMap(item => item.evidence || []).filter(item => item.name === name).at(-1);
  return found ? JSON.parse(found.content) : null;
}
// Derive the final choice from the actual public evidence. The run never picks
// a seed/profile, rewrites an assigned case, or assumes every restore succeeds.
function supportedFinal(view) {
  if (view.lesson_id === 'report-or-evidence') {
    const manifest = record(view, 'manifest.json');
    assert.ok(manifest && typeof manifest.upload_checksum_verified === 'boolean');
    if (!manifest.upload_checksum_verified) return 'repair_upload';
    if (!manifest.matches_expected_inventory) return 'repair_inventory';
    const restored = record(view, 'restore-test.json');
    if (!restored) return 'require_restore';
    assert.equal(restored.snapshot_id, manifest.snapshot_id);
    assert.equal(restored.job_id, manifest.job_id);
    if (restored.result === 'passed') {
      assert.equal(restored.matches_expected_inventory, true);
      assert.equal(restored.all_file_checksums_match, true);
      return 'accept_scope';
    }
    assert.equal(restored.result, 'failed_content_mismatch');
    return 'repair_restore';
  }
  const requested = record(view, 'requested-check.json');
  const result = record(view, 'requested-scope-check.json') || record(view, 'check-record.json');
  assert.ok(requested && result);
  const sameScope = ['environment', 'revision', 'tenant', 'check'].every(key => requested[key] === result[key]);
  if (!sameScope) return 'require_matching_check';
  assert.ok(['passed', 'failed'].includes(result.result));
  return result.result === 'passed' ? 'accept_scope' : 'hold_failed';
}
async function captureLayout(page, lessonId) {
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      main: document.querySelector('#main-content').getBoundingClientRect().width,
      background: getComputedStyle(document.documentElement).backgroundColor }));
    assert.equal(metrics.viewport, width);
    assert.ok(metrics.document <= width + 1, 'Chat layout must not overflow the viewport');
    assert.ok(metrics.main > 200 && metrics.main <= width, 'The lesson remains usable at this width');
    assert.equal(metrics.background, 'rgb(17, 19, 18)', 'The real chat stylesheet must load');
    const filename = `chat-${lessonId}-${name}.png`;
    // Lesson interface only. Never capture a login form, trace, storageState or HTML.
    await page.locator('.academy-main').screenshot({ path: join(EV, filename), animations: 'disabled' });
    screenshots.push({ filename, viewport: { width, height }, sha256: sha(readFileSync(join(EV, filename))), metrics });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

try {
  await db.connect();
  connected = true;
  assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, DB_NAME);
  await launch();
  learners = [await login(0), await login(1)];
  assert.notEqual(learners[0].owner, learners[1].owner);
  const owners = learners.map(item => item.owner);
  const existing = await db.query('SELECT 1 FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) AND lesson_id=ANY($2::text[])', [owners, lessons.map(id => `chat-${id}`)]);
  assert.equal(existing.rowCount, 0, 'Fresh disposable chat fixtures required; this run never deletes or replaces earlier attempts');
  const legacy = (await db.query('SELECT owner_id, lesson_id, content, version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) AND lesson_id=ANY($2::text[]) ORDER BY owner_id,lesson_id', [owners, lessons])).rows;
  pass('two real sign-ins resolve to separate disposable learner identities');

  for (const lessonId of lessons) {
    stage = `${lessonId} explicit start and assigned evidence`;
    for (const learner of learners) {
      await openLesson(learner, lessonId);
      const untouched = await read(learner.page, lessonId);
      assert.equal(untouched.status, 404);
      assert.equal(untouched.body.error, 'no_attempt');
    }
    let a = await start(learners[0], lessonId);
    await captureLayout(learners[0].page, lessonId);
    a = await decide(learners[0], lessonId, a, 'nothing');
    assert.equal(a.stage, 'verification');
    assert.ok(a.messages.some(item => item.role === 'academy' && /too restrictive/.test(item.text)));
    await learners[0].page.reload();
    await expect(learners[0].page.locator('#chat-status')).toContainText('Your saved lesson is ready');
    assert.deepEqual(stable(await view(learners[0].page, lessonId)), stable(a));
    pass(`${lessonId}: actual start, evidence, decision feedback, reload and responsive layout`);

    stage = `${lessonId} owner isolation`;
    const forgedRead = await read(learners[1].page, lessonId, `?owner_id=${learners[0].owner}`);
    assert.equal(forgedRead.status, 404, 'An owner query cannot expose the other learner’s attempt');
    const forgedStart = await post(learners[1].page, lessonId, { action: 'start', request_id: randomUUID(), owner_id: learners[0].owner });
    assert.equal(forgedStart.status, 400);
    let b = await start(learners[1], lessonId);
    assert.notEqual(a.attempt_id, b.attempt_id);
    // Compare case identity/records, not randomly selected outcome profiles.
    assert.notEqual(sha(a.messages[0]), sha(b.messages[0]));
    b = await decide(learners[1], lessonId, b, 'accept_all');
    const crossAttempt = await post(learners[1].page, lessonId, { action: 'submit', request_id: randomUUID(),
      attempt_id: a.attempt_id, expected_version: b.version, stage: b.stage,
      choice_id: lessonId === 'report-or-evidence' ? 'controlled_restore' : 'check_requested_scope' });
    assert.equal(crossAttempt.status, 409);
    assert.equal(crossAttempt.body.error, 'attempt_conflict');
    assert.deepEqual(stable(await view(learners[0].page, lessonId)), stable(a));
    assert.deepEqual(stable(await view(learners[1].page, lessonId)), stable(b));
    const ownRead = await read(learners[1].page, lessonId, `?owner_id=${learners[0].owner}`);
    assert.equal(ownRead.status, 200);
    assert.equal(ownRead.body.attempt_id, b.attempt_id);
    for (const [index, result] of [a, b].entries()) snapshots.set(`${index}:${lessonId}`, stable(result));
    pass(`${lessonId}: independent cases, separate decisions and denied cross-owner mutation`, { learners: [summary(a), summary(b)] });
  }

  stage = 'browser closure and fresh login recovery';
  await closeBrowser(); // Destroy every browser context and cookie; never export/reuse storageState.
  await launch();
  learners = [await login(0), await login(1)];
  assert.deepEqual(learners.map(item => item.owner), owners);
  for (const learner of learners) for (const lessonId of lessons) {
    await openLesson(learner, lessonId);
    assert.deepEqual(stable(await view(learner.page, lessonId)), snapshots.get(`${learner.index}:${lessonId}`));
    await expect(learner.page.locator('#conversation .learner-message')).toHaveCount(1);
  }
  pass('both cases and decisions survive browser closure and real fresh logins for both learners');

  stage = 'application restart and fresh login recovery';
  await closeBrowser();
  try {
    execFileSync('bash', [RESTART, DB_NAME], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024 });
  } catch {
    throw new Error('Checked-in disposable application restart failed; inspect the separately redacted CI server log');
  }
  await launch();
  learners = [await login(0), await login(1)];
  assert.deepEqual(learners.map(item => item.owner), owners);
  for (const learner of learners) for (const lessonId of lessons) {
    await openLesson(learner, lessonId);
    assert.deepEqual(stable(await view(learner.page, lessonId)), snapshots.get(`${learner.index}:${lessonId}`));
  }
  pass('application restart plus new browsers and fresh sign-ins retain all four exact attempts');

  for (const learner of learners) for (const lessonId of lessons) {
    stage = `learner ${learner.index + 1} ${lessonId} verification and completion`;
    await openLesson(learner, lessonId);
    const before = await view(learner.page, lessonId);
    const verificationChoice = learner.index === 1 ? 'confirm_report'
      : lessonId === 'report-or-evidence' ? 'controlled_restore' : 'check_requested_scope';
    let result = await decide(learner, lessonId, before, verificationChoice);
    assert.equal(result.stage, 'final');
    const evidenceCount = item => item.messages.flatMap(message => message.evidence || []).length;
    assert.equal(evidenceCount(result), evidenceCount(before) + (learner.index === 0 ? 1 : 0));
    result = await decide(learner, lessonId, result, supportedFinal(result));
    assert.equal(result.status, 'completed');
    assert.equal(result.version, 4);
    assert.equal(result.coached, false);
    await expect(learner.page.locator('#lesson-complete')).toContainText('No formal award');
    if (lessonId === 'report-or-evidence') await expect(learner.page.locator('#next-lesson')).toHaveAttribute('href', routeFor('same-scope'));
    await learner.page.reload();
    await expect(learner.page.locator('#lesson-complete')).toBeVisible();
    assert.deepEqual(stable(await view(learner.page, lessonId)), stable(result));
    const persisted = (await db.query('SELECT content, version FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [learner.owner, `chat-${lessonId}`])).rows[0];
    assert.equal(persisted.version, 4);
    assert.equal(JSON.parse(persisted.content).attempt.decisions.length, 3);
    pass(`learner ${learner.index + 1} ${lessonId}: evidence-dependent final judgment and saved completion`, summary(result));
  }

  stage = 'legacy preservation and browser errors';
  assert.deepEqual((await db.query('SELECT owner_id, lesson_id, content, version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) AND lesson_id=ANY($2::text[]) ORDER BY owner_id,lesson_id', [owners, lessons])).rows, legacy);
  assert.deepEqual(pageErrors, [], 'No unhandled browser script errors may occur');
  pass('legacy worksheet drafts preserved and no unhandled browser script errors');
} catch (error) {
  results.push({ name: stage, result: 'FAIL', observed_at: new Date().toISOString(), detail: sanitize(error) });
  console.error(`FAIL chat browser ${stage}: ${sanitize(error)}`);
  process.exitCode = 1;
} finally {
  try { await closeBrowser(); }
  catch (error) { results.push({ name: 'browser cleanup', result: 'FAIL', detail: sanitize(error) }); process.exitCode = 1; }
  if (connected) {
    try { await db.end(); }
    catch (error) { results.push({ name: 'database connection cleanup', result: 'FAIL', detail: sanitize(error) }); process.exitCode = 1; }
  }
  const receipt = { started_at: startedAt, finished_at: new Date().toISOString(), node: process.version,
    browser: browserVersion ?? null, source_commit: /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '') ? process.env.GITHUB_SHA : null,
    results, screenshots, boundary: 'Real Chromium, Keycloak and PostgreSQL in the explicit session-only disposable CI fixture. Scenario evidence is simulated. No production, live learner, hosted ChatGPT, app-store installation or release acceptance. No passwords, tokens, cookies, complete HTML or storageState retained.' };
  writeFileSync(join(EV, 'chat-browser-results.json'), JSON.stringify(receipt, null, 2));
}
console.log(`RESULT: chat browser ${results.filter(item => item.result === 'PASS').length}/${results.length} PASS`);
