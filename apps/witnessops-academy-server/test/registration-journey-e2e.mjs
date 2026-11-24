// Real registration, email verification and recovery in the existing disposable CI stack.
// This file never uses a production provider, delivers external mail, or grants a pilot place.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync, renameSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import pg from 'pg';
import { chromium, expect } from '@playwright/test';
import { env, secret, int } from '../src/env.mjs';
import { createSessionTokenCodec } from '../src/session-tokens.mjs';
import { startRegistrationMailCapture, capturedActionLink } from './registration-smtp-capture.mjs';
import { createInvitationBatch } from '../src/pilot-invitations.mjs';

const results = [];
const cleanup = [];
let stage = 'disposable_guards';
let failure = false;
let db;
let browser;
let mail;
let originalRealm;
let originalVerifyAction;
let originalProfile;
let expectedProfile;
let profilePath;
let realmChanged = false;
let actionChanged = false;
let profileChanged = false;
let adminToken;
let adminTokenUntil = 0;
let APP;
let KC;
let ISSUER;
let REALM;
let EV;
let restart;
let pgName;
let admin;
let planned = [];
const stamp = () => new Date().toISOString();
const startedAt = stamp();
const pass = name => { results.push({ name, result: 'PASS' }); console.log('PASS registration ' + name); };
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const EXPECTED_RESULTS = 8;
const knownImage = 'quay.io/keycloak/keycloak:26.8.2@sha256:c68e286cacd87b942ac1939a0a1481461109d6acd3a57dc496969a319a76bbf0';

function loopbackOrigin(value) {
  const url = new URL(value);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.ok(['http:', 'https:'].includes(url.protocol));
  assert.ok(!url.username && !url.password && !url.search && !url.hash);
  return url.href.replace(/\/$/, '');
}

function inspectContainer(name) {
  assert.ok(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$/.test(name));
  return JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }))[0];
}

function privateAddress(value) {
  if (net.isIP(value) !== 4) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function replaceFlag(value) {
  assert.ok(['true', 'false'].includes(value));
  assert.equal(digest(readFileSync(profilePath)), digest(expectedProfile), 'FIXTURE_PROFILE_DRIFT');
  const lines = expectedProfile.toString('utf8').split('\n');
  const matching = lines.filter(line => line.startsWith('ACADEMY_SELF_SERVICE_REGISTRATION='));
  assert.equal(matching.length, 1, 'ONE_PERSISTED_REGISTRATION_FLAG_REQUIRED');
  const updated = Buffer.from(lines.map(line => line.startsWith('ACADEMY_SELF_SERVICE_REGISTRATION=')
    ? `ACADEMY_SELF_SERVICE_REGISTRATION=${value}` : line).join('\n'));
  writeFileSync(profilePath + '.registration-next', updated, { mode: 0o600, flag: 'wx' });
  renameSync(profilePath + '.registration-next', profilePath);
  profileChanged = true;
  expectedProfile = updated;
  execFileSync('bash', [restart, pgName], { env: { ...process.env, ACADEMY_SELF_SERVICE_REGISTRATION: value },
    stdio: 'pipe', timeout: 30_000, maxBuffer: 1024 * 1024 });
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  assert.ok(response.status >= 200 && response.status < 300, 'FIXTURE_HTTP_STATUS');
  const text = await response.text();
  assert.ok(Buffer.byteLength(text) <= 2 * 1024 * 1024, 'FIXTURE_RESPONSE_SIZE');
  return text ? JSON.parse(text) : null;
}

async function token() {
  if (adminToken && Date.now() < adminTokenUntil) return adminToken;
  const result = await jsonFetch(KC + '/realms/master/protocol/openid-connect/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli',
      username: env('KC_ADMIN_USERNAME'), password: secret('KC_ADMIN_PASSWORD') }),
  });
  assert.ok(typeof result.access_token === 'string' && result.access_token.length > 20);
  adminToken = result.access_token;
  adminTokenUntil = Date.now() + Math.max(1, Number(result.expires_in) - 10) * 1000;
  return adminToken;
}

async function userRecord(user) {
  const found = await admin('GET', '/users?exact=true&username=' + encodeURIComponent(user.username));
  assert.ok(Array.isArray(found) && found.length <= 1, 'ONE_SYNTHETIC_USER');
  if (!found.length) return null;
  assert.equal(found[0].username, user.username, 'SYNTHETIC_USERNAME_BINDING');
  assert.equal(found[0].email, user.email, 'SYNTHETIC_EMAIL_BINDING');
  if (user.subject) assert.equal(found[0].id, user.subject, 'SYNTHETIC_SUBJECT_DRIFT');
  user.subject = found[0].id;
  return found[0];
}

async function identity(subject) {
  const rows = (await db.query('SELECT id, issuer, subject FROM academy_identities WHERE issuer=$1 AND subject=$2', [ISSUER, subject])).rows;
  assert.ok(rows.length <= 1, 'ONE_ACADEMY_IDENTITY');
  return rows[0] || null;
}

async function noIdentity(user) {
  assert.ok(user.subject);
  assert.equal(await identity(user.subject), null, 'NO_PREMATURE_ACADEMY_IDENTITY');
}

async function grantCounts() {
  return (await db.query(`SELECT
    (SELECT count(*)::int FROM academy_pilot_grants) AS grants,
    (SELECT count(*)::int FROM academy_pilot_invitations) AS invitations`)).rows[0];
}

async function noPilotAccess(page, id) {
  for (const lesson of ['report-or-evidence', 'same-scope']) {
    const response = await page.request.get(APP + `/academy/api/lessons/${lesson}/draft`);
    assert.equal(response.status(), 403, 'DRAFT_REQUIRES_EXPLICIT_GRANT');
    assert.equal((await response.json()).error, 'access_required');
    assert.equal((await page.request.get(APP + `/academy/learn/${lesson}`)).status(), 403);
  }
  assert.equal((await db.query('SELECT 1 FROM academy_pilot_grants WHERE identity_id=$1', [id])).rowCount, 0);
}

async function sessionRow(context) {
  const cookie = (await context.cookies()).find(item => ['academy_sid', '__Host-academy_sid'].includes(item.name));
  assert.ok(cookie, 'ACADEMY_SESSION_PRESENT');
  return { cookie, hash: digest(cookie.value) };
}

async function savedLessonWork(page, lesson) {
  const response = await page.request.get(APP + `/academy/api/lessons/${lesson}/draft`);
  assert.equal(response.status(), 200, 'ADMITTED_DRAFT_READ');
  return (await response.json()).content;
}

function launchBrowser() {
  return chromium.launch({ headless: true, timeout: 20_000,
    ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}) });
}

async function accountIdentity(context, page, subject) {
  await expect(page).toHaveURL(APP + '/academy/account');
  await expect(page.locator('#sign-out')).toBeVisible();
  await expect(page.locator('#account-actions')).toContainText('Your WitnessOps account is ready');
  const cookie = (await context.cookies()).find(item => ['academy_sid', '__Host-academy_sid'].includes(item.name));
  assert.ok(cookie, 'ACADEMY_SESSION_PRESENT');
  const session = (await db.query('SELECT * FROM academy_sessions WHERE token_hash=$1', [digest(cookie.value)])).rows[0];
  assert.ok(session);
  const owner = await identity(subject);
  assert.ok(owner);
  assert.equal(session.identity_id, owner.id);
  const codec = createSessionTokenCodec(secret('ACADEMY_TOKEN_KEYRING'), { issuer: ISSUER, clientId: env('ACADEMY_OIDC_CLIENT_ID', 'academy-app') });
  const idToken = codec.open(session.tokens_ciphertext, session).tokens.id_token;
  const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(claims.iss, ISSUER);
  assert.equal(claims.sub, subject);
  return { owner, claims };
}

async function contextPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
  return { context, page };
}

async function registrationForm(user, password) {
  const flow = await contextPage();
  const { page } = flow;
  let authorization;
  let callback;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === new URL(KC).origin && url.pathname.endsWith('/protocol/openid-connect/auth')) {
      authorization = {
        create: url.searchParams.get('prompt') === 'create',
        code: url.searchParams.get('response_type') === 'code',
        callback: url.searchParams.get('redirect_uri') === APP + '/academy/auth/callback',
        openid: (url.searchParams.get('scope') || '').split(' ').includes('openid'),
        email: (url.searchParams.get('scope') || '').split(' ').includes('email'),
        state: Boolean(url.searchParams.get('state')), nonce: Boolean(url.searchParams.get('nonce')),
        pkce: url.searchParams.get('code_challenge_method') === 'S256' && Boolean(url.searchParams.get('code_challenge')),
      };
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === APP && url.pathname === '/academy/auth/callback') {
      callback = { status: response.status(), code: url.searchParams.has('code'), state: url.searchParams.has('state') };
    }
  });
  await page.goto(APP + '/academy/account');
  await page.locator('#create-account').click();
  await expect(page.locator('#kc-register-form')).toBeVisible();
  assert.ok(authorization && Object.values(authorization).every(Boolean), 'REGISTRATION_AUTHORIZATION_CONTRACT');
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="firstName"]').fill('Synthetic');
  await page.locator('input[name="lastName"]').fill('Registration');
  if (password) {
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password-confirm"]').fill(password);
  } else assert.equal(await page.locator('input[name="password"]').count(), 0, 'PASSWORD_FOLLOWS_VERIFICATION');
  assert.equal(user.absentBefore, true, 'RECIPIENT_WAS_ABSENT');
  user.submitted = true;
  await page.locator('#kc-register-form [type="submit"]').click();
  return { ...flow, callback: () => callback };
}

async function setPassword(page, password) {
  await expect(page.locator('#password-new')).toBeVisible();
  await page.locator('#password-new').fill(password);
  await page.locator('#password-confirm').fill(password);
  await page.locator('#kc-passwd-update-form [type="submit"]').click();
}

async function ordinaryLogin(user, password) {
  const flow = await contextPage();
  await flow.page.goto(APP + '/academy/auth/login?return=account');
  await flow.page.locator('#username').fill(user.username);
  await flow.page.locator('#password').fill(password);
  await flow.page.locator('#kc-login').click();
  return { ...flow, ...await accountIdentity(flow.context, flow.page, user.subject) };
}

async function cleanStep(name, operation) {
  try { await operation(); cleanup.push({ name, result: 'PASS' }); }
  catch { cleanup.push({ name, result: 'FAIL' }); failure = true; }
}

try {
  assert.equal(process.env.ACADEMY_E2E, '1');
  assert.equal(process.env.ACADEMY_REGISTRATION_DISPOSABLE, '1');
  assert.equal(env('ACADEMY_ACCESS_POLICY'), 'approved-free-pilot');
  assert.equal(env('KC_ADMIN_PASSWORD_GRANT'), '1');
  assert.equal(env('KC_CREATE_TEST_USERS'), '1');
  assert.equal(env('KC_ADMIN_USERNAME'), 'ci-admin');
  APP = loopbackOrigin(env('ACADEMY_TEST_APP_URL', env('ACADEMY_PUBLIC_ORIGIN')));
  KC = loopbackOrigin(env('KC_ADMIN_BASE_URL'));
  assert.equal(APP, new URL(APP).origin);
  assert.equal(KC, new URL(KC).origin);
  ISSUER = loopbackOrigin(env('ACADEMY_OIDC_ISSUER'));
  REALM = env('KC_REALM');
  assert.equal(REALM, 'academy');
  assert.equal(ISSUER, KC + '/realms/' + REALM);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(env('ACADEMY_DB_HOST')));
  pgName = env('ACADEMY_DB_NAME');
  assert.equal(pgName, 'academy');
  const kcContainer = inspectContainer(env('ACADEMY_TEST_KC_CONTAINER'));
  assert.equal(kcContainer.Name, '/academy-kc');
  assert.equal(kcContainer.Config.Image, knownImage);
  assert.equal(kcContainer.State.Running, true);
  const bindings = kcContainer.NetworkSettings.Ports['8080/tcp'];
  assert.equal(bindings?.length, 1);
  assert.equal(bindings[0].HostIp, '127.0.0.1');
  assert.equal(bindings[0].HostPort, new URL(KC).port);
  const networks = Object.values(kcContainer.NetworkSettings.Networks);
  assert.equal(networks.length, 1, 'ONE_DISPOSABLE_DOCKER_NETWORK');
  const network = networks[0];
  assert.ok(privateAddress(network.Gateway) && privateAddress(network.IPAddress));
  assert.ok(Object.values(networkInterfaces()).flat().some(item => item?.address === network.Gateway), 'HOST_OWNS_DOCKER_GATEWAY');
  const pgContainer = inspectContainer(env('ACADEMY_PG_CONTAINER'));
  assert.equal(pgContainer.Name, '/academy-pg');
  assert.equal(pgContainer.State.Running, true);
  assert.equal(pgContainer.Config.Image, env('POSTGRES_IMAGE'));
  assert.match(pgContainer.Config.Image, /^postgres:17@sha256:[a-f0-9]{64}$/);
  assert.equal(pgContainer.NetworkSettings.Ports['5432/tcp']?.[0]?.HostIp, '127.0.0.1');
  assert.equal(pgContainer.NetworkSettings.Ports['5432/tcp']?.[0]?.HostPort, String(int('ACADEMY_DB_PORT', 5432)));
  profilePath = resolve(env('ACADEMY_CI_ENV'));
  const stat = lstatSync(profilePath);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
  assert.equal(stat.uid, process.getuid());
  originalProfile = readFileSync(profilePath);
  expectedProfile = originalProfile;
  assert.match(originalProfile.toString('utf8'), /^ACADEMY_SELF_SERVICE_REGISTRATION=(true|false)$/m);
  restart = realpathSync(env('ACADEMY_TEST_RESTART_APP_CMD'));
  assert.equal(restart, realpathSync(fileURLToPath(new URL('./restart-app.sh', import.meta.url))));
  EV = env('ACADEMY_TEST_EVIDENCE_DIR');
  mkdirSync(EV, { recursive: true });
  const run = crypto.randomBytes(8).toString('hex');
  planned = ['verified', 'unverified'].map(label => ({ label, username: `registration-${label}-${run}`,
    email: `registration-${label}-${run}@example.invalid` }));
  const password = secret('TEST_LEARNER_B_PASSWORD');
  const recoveredPassword = secret('TEST_LEARNER_A_PASSWORD');
  assert.ok(password.length >= 16 && recoveredPassword.length >= 16 && password !== recoveredPassword);
  db = new pg.Pool({ host: env('ACADEMY_DB_HOST'), port: int('ACADEMY_DB_PORT', 5432), database: pgName,
    user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: secret('ACADEMY_TEST_PGADMIN_PASSWORD'),
    max: 2, connectionTimeoutMillis: 5_000, query_timeout: 5_000, statement_timeout: 5_000 });
  admin = async (method, path = '', body) => jsonFetch(KC + `/admin/realms/${REALM}` + path, {
    method, headers: { Authorization: 'Bearer ' + await token(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  originalRealm = await admin('GET');
  assert.equal(originalRealm.registrationAllowed, false);
  assert.equal(originalRealm.verifyEmail, false);
  assert.equal(Object.keys(originalRealm.smtpServer || {}).length, 0, 'EMPTY_DISPOSABLE_SMTP_ONLY');
  originalVerifyAction = await admin('GET', '/authentication/required-actions/VERIFY_EMAIL');
  const updatePassword = await admin('GET', '/authentication/required-actions/UPDATE_PASSWORD');
  assert.equal(originalVerifyAction.enabled, true);
  assert.equal(updatePassword.enabled, true);
  assert.ok(originalVerifyAction.priority < updatePassword.priority, 'VERIFY_BEFORE_PASSWORD');
  const profile = await admin('GET', '/users/profile');
  assert.ok(profile.attributes?.find(attribute => attribute.name === 'email')?.required?.roles?.includes('user'), 'REGISTRATION_REQUIRES_EMAIL');
  for (const user of planned) {
    assert.equal(await userRecord(user), null, 'FRESH_SYNTHETIC_RECIPIENT');
    user.absentBefore = true;
  }
  let grantsBefore = await grantCounts();
  mail = await startRegistrationMailCapture({ host: network.Gateway, peer: network.IPAddress, recipients: planned.map(user => user.email) });
  browser = await launchBrowser();

  stage = 'closed_registration';
  replaceFlag('false');
  const closed = await contextPage();
  assert.equal((await closed.page.goto(APP + '/academy/account')).status(), 200);
  await expect(closed.page.locator('#registration-status')).toBeVisible();
  const denied = await closed.page.request.get(APP + '/academy/auth/register', { maxRedirects: 0 });
  assert.equal(denied.status(), 302);
  assert.equal(denied.headers().location, '/academy/account');
  await closed.context.close();
  pass('closed flag retains the public account page and never starts registration');

  stage = 'enable_disposable_registration';
  actionChanged = true;
  await admin('PUT', '/authentication/required-actions/VERIFY_EMAIL', { ...originalVerifyAction, enabled: true, defaultAction: true });
  realmChanged = true;
  await admin('PUT', '', { registrationAllowed: true, verifyEmail: false,
    smtpServer: { host: mail.host, port: String(mail.port), from: 'academy-ci@example.invalid',
      fromDisplayName: 'Synthetic Academy CI', auth: 'false', ssl: 'false', starttls: 'false' } });
  replaceFlag('true');

  stage = 'registration_pending_verification';
  const verified = planned[0];
  const first = await registrationForm(verified);
  const verificationMessage = await mail.next(verified.email);
  const pending = await userRecord(verified);
  assert.equal(pending.emailVerified, false);
  assert.ok(pending.requiredActions.includes('VERIFY_EMAIL'));
  assert.ok(pending.requiredActions.includes('UPDATE_PASSWORD'));
  const credentials = await admin('GET', `/users/${encodeURIComponent(verified.subject)}/credentials`);
  assert.ok(!credentials.some(credential => credential.type === 'password'));
  await noIdentity(verified);
  assert.equal(first.callback(), undefined);
  assert.ok(!(await first.context.cookies()).some(cookie => ['academy_sid', '__Host-academy_sid'].includes(cookie.name)));
  assert.deepEqual(await grantCounts(), grantsBefore);
  pass('actual registration waits for verification mail before password and Academy identity/session');

  stage = 'verified_registration_callback';
  await first.page.goto(capturedActionLink(verificationMessage, KC, REALM));
  await setPassword(first.page, password);
  const admitted = await accountIdentity(first.context, first.page, verified.subject);
  assert.equal(admitted.claims.email_verified, true);
  assert.deepEqual(first.callback(), { status: 302, code: true, state: true });
  assert.equal((await userRecord(verified)).emailVerified, true);
  await noPilotAccess(first.page, admitted.owner.id);
  assert.deepEqual(await grantCounts(), grantsBefore);
  pass('captured email click and real Keycloak callback create one verified account with no course grant');

  stage = 'ordinary_login_identity';
  await first.page.locator('#sign-out').click();
  await expect(first.page).toHaveURL(APP + '/academy/account');
  await expect(first.page.locator('#sign-in')).toBeVisible();
  await expect(first.page.locator('#sign-out')).toHaveCount(0);
  await first.context.close();
  const returning = await ordinaryLogin(verified, password);
  assert.equal(returning.owner.id, admitted.owner.id);
  await noPilotAccess(returning.page, returning.owner.id);
  await returning.page.locator('#sign-out').click();
  await expect(returning.page).toHaveURL(APP + '/academy/account');
  await expect(returning.page.locator('#sign-in')).toBeVisible();
  await expect(returning.page.locator('#sign-out')).toHaveCount(0);
  await returning.context.close();
  pass('fresh ordinary login reuses issuer/subject and both draft APIs remain denied');

  stage = 'admitted_free_learner_journey';
  // The intended free learner: a self-registered, verified account receives an explicit
  // owner-approved grant, saves identifiable work, signs out, closes the browser and returns.
  const issued = (await createInvitationBatch(db, {
    approvalReference: 'synthetic-owner-approved-free-learner-journey',
    administratorReference: 'synthetic-authorized-administrator',
    recipients: [{ issuer: ISSUER, subject: verified.subject }],
  })).invitations[0];
  verified.invited = true;
  const learner = await ordinaryLogin(verified, password);
  await learner.page.goto(APP + '/academy/invitation#token=' + issued.token);
  assert.equal(new URL(learner.page.url()).hash, '', 'PRIVATE_INVITATION_FRAGMENT_CLEARED');
  await expect(learner.page.locator('#invitation-status')).toContainText('This account can accept');
  await learner.page.locator('#accept-invitation').click();
  await expect(learner.page).toHaveURL(APP + '/academy/learn/report-or-evidence');
  await expect(learner.page.locator('#progress-status')).toContainText('No saved work');
  const marker = `Synthetic free learner ${run}: the report is not evidence of the saved file.`;
  await learner.page.locator('#reason-1').fill(marker);
  await learner.page.locator('#save-progress').click();
  await expect(learner.page.locator('#progress-status')).toContainText(/^Saved/);
  const savedWork = await savedLessonWork(learner.page, 'report-or-evidence');
  assert.ok(savedWork.includes(marker), 'IDENTIFIABLE_WORK_SAVED');
  const ownedRows = (await db.query('SELECT owner_id FROM academy_lesson_drafts WHERE content LIKE $1', ['%' + run + '%'])).rows;
  assert.deepEqual(ownedRows.map(row => row.owner_id), [learner.owner.id], 'WORK_OWNED_BY_LEARNER_ONLY');
  const signedIn = await sessionRow(learner.context);
  assert.ok((await admin('GET', `/users/${encodeURIComponent(verified.subject)}/sessions`)).length >= 1);
  await learner.page.locator('#sign-out').click();
  await expect(learner.page.locator('#progress-status')).toContainText('Signed out. Sign in again to recover your saved work.');
  await expect(learner.page.locator('#reason-1')).toHaveValue('');
  const ended = (await db.query('SELECT revoked_at IS NOT NULL AS revoked FROM academy_sessions WHERE token_hash=$1', [signedIn.hash])).rows[0];
  assert.equal(ended?.revoked, true, 'ACADEMY_SESSION_REVOKED_ON_SIGN_OUT');
  assert.equal((await admin('GET', `/users/${encodeURIComponent(verified.subject)}/sessions`)).length, 0, 'IDP_SESSION_ENDED_ON_SIGN_OUT');
  const replay = await fetch(APP + '/academy/api/lessons/report-or-evidence/draft', {
    headers: { Cookie: `${signedIn.cookie.name}=${signedIn.cookie.value}` }, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  assert.equal(replay.status, 401, 'SIGNED_OUT_COOKIE_DENIED');
  await learner.context.close();
  await browser.close();
  browser = await launchBrowser();
  const back = await ordinaryLogin(verified, password);
  assert.equal(back.owner.id, learner.owner.id);
  await expect(back.page.locator('#lesson-access')).toBeVisible();
  await back.page.goto(APP + '/academy/learn/report-or-evidence');
  await expect(back.page.locator('#progress-status')).toContainText('loaded');
  await expect(back.page.locator('#reason-1')).toHaveValue(marker);
  assert.equal(await savedLessonWork(back.page, 'report-or-evidence'), savedWork);
  await back.page.locator('#sign-out').click();
  await expect(back.page.locator('#progress-status')).toContainText('Signed out.');
  await back.context.close();
  grantsBefore = await grantCounts();
  pass('verified self-registered learner is admitted, saves work, signs out everywhere, closes the browser and recovers exactly that work');

  stage = 'password_recovery_mail';
  await admin('PUT', '', { resetPasswordAllowed: true });
  const recovery = await contextPage();
  await recovery.page.goto(APP + '/academy/auth/login?return=account');
  await recovery.page.getByRole('link', { name: /forgot password/i }).click();
  await recovery.page.locator('#username').fill(verified.username);
  await recovery.page.locator('#kc-reset-password-form [type="submit"]').click();
  const recoveryMessage = await mail.next(verified.email);
  await recovery.page.goto(capturedActionLink(recoveryMessage, KC, REALM));
  await setPassword(recovery.page, recoveredPassword);
  await recovery.context.close();
  const oldPassword = await contextPage();
  await oldPassword.page.goto(APP + '/academy/auth/login?return=account');
  await oldPassword.page.locator('#username').fill(verified.username);
  await oldPassword.page.locator('#password').fill(password);
  await oldPassword.page.locator('#kc-login').click();
  await expect(oldPassword.page.locator('#input-error, .kc-feedback-text, [id*="error"]').first()).toBeVisible();
  assert.ok(!(await oldPassword.context.cookies()).some(cookie => ['academy_sid', '__Host-academy_sid'].includes(cookie.name)));
  await oldPassword.context.close();
  const recovered = await ordinaryLogin(verified, recoveredPassword);
  assert.equal(recovered.owner.id, admitted.owner.id);
  await recovered.page.goto(APP + '/academy/learn/report-or-evidence');
  await expect(recovered.page.locator('#progress-status')).toContainText('loaded');
  await expect(recovered.page.locator('#reason-1')).toHaveValue(marker);
  assert.equal(await savedLessonWork(recovered.page, 'report-or-evidence'), savedWork);
  await recovered.context.close();
  pass('actual captured recovery email resets the password, rejects the old one and recovers the same saved work');

  stage = 'isolation_and_support';
  const other = await contextPage();
  await other.page.goto(APP + '/academy/auth/login?return=account');
  await other.page.locator('#username').fill(env('TEST_LEARNER_B_USERNAME'));
  await other.page.locator('#password').fill(password);
  await other.page.locator('#kc-login').click();
  await expect(other.page).toHaveURL(APP + '/academy/account');
  await expect(other.page.locator('#sign-out')).toBeVisible();
  for (const suffix of ['', '?owner_id=' + admitted.owner.id, '?sub=' + encodeURIComponent(verified.subject)]) {
    const response = await other.page.request.get(APP + '/academy/api/lessons/report-or-evidence/draft' + suffix);
    assert.ok([200, 403, 404].includes(response.status()), 'OTHER_LEARNER_DRAFT_STATUS');
    assert.ok(!(await response.text()).includes(run), 'OTHER_LEARNER_CANNOT_READ_WORK');
  }
  const forged = await other.page.evaluate(async ({ owner }) => {
    const csrf = document.querySelector('#academy-csrf') ? JSON.parse(document.querySelector('#academy-csrf').textContent) : '';
    const response = await fetch('/academy/api/lessons/report-or-evidence/draft', { method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ content: 'forged overwrite', expected_version: 1, owner_id: owner }) });
    return response.status;
  }, { owner: admitted.owner.id });
  assert.ok([400, 403, 409].includes(forged), 'FORGED_OWNER_WRITE_DENIED');
  assert.equal((await db.query('SELECT content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [admitted.owner.id, 'report-or-evidence'])).rows[0].content, savedWork);
  await other.context.close();
  const anonymous = await contextPage();
  const supportStates = [
    ['/academy/account', 200], ['/academy/learn/report-or-evidence', 403], ['/academy/invitation', 200],
    ['/academy/auth/callback?code=x&state=y', 400],
  ];
  for (const [path, expected] of supportStates) {
    const response = await anonymous.page.goto(APP + path);
    assert.equal(response.status(), expected, 'SUPPORT_STATE_STATUS ' + path);
    await expect(anonymous.page.locator('a[href="https://witnessops.com/support#support-request"]')).toHaveCount(1);
    await expect(anonymous.page.locator('a[href^="mailto:engage@mail.witnessops.com"]')).toHaveCount(1);
  }
  await anonymous.context.close();
  pass('another learner cannot read or overwrite the work, and logged-out and error states offer support');

  stage = 'unverified_signed_callback';
  // A deliberate disposable-only IdP misconfiguration exercises Academy's independent claim gate.
  await admin('PUT', '/authentication/required-actions/VERIFY_EMAIL', { ...originalVerifyAction, enabled: true, defaultAction: false });
  const unverified = planned[1];
  const rejected = await registrationForm(unverified, password);
  await expect(rejected.page).toHaveURL(url => url.origin === APP && url.pathname === '/academy/auth/callback');
  await expect(rejected.page.locator('body')).toContainText(/verify.*email|email.*verif/i);
  assert.deepEqual(rejected.callback(), { status: 400, code: true, state: true });
  assert.equal((await userRecord(unverified)).emailVerified, false);
  await noIdentity(unverified);
  assert.ok(!(await rejected.context.cookies()).some(cookie => ['academy_sid', '__Host-academy_sid'].includes(cookie.name)));
  assert.deepEqual(await grantCounts(), grantsBefore);
  await rejected.context.close();
  await admin('PUT', '/authentication/required-actions/VERIFY_EMAIL', { ...originalVerifyAction, enabled: true, defaultAction: true });
  pass('real signed callback without verified email creates no Academy identity, session or pilot grant');
} catch {
  failure = true;
  // Playwright/HTTP exceptions can contain action-token URLs and form values. Never print them.
  console.error('FAIL registration stage=' + stage);
} finally {
  if (browser) await cleanStep('browser_closed', () => browser.close());
  if (profileChanged) await cleanStep('app_profile_restored', async () => {
    assert.equal(digest(readFileSync(profilePath)), digest(expectedProfile), 'FIXTURE_PROFILE_DRIFT');
    writeFileSync(profilePath + '.registration-restore', originalProfile, { mode: 0o600, flag: 'wx' });
    renameSync(profilePath + '.registration-restore', profilePath);
    execFileSync('bash', [restart, pgName], { env: process.env, stdio: 'pipe', timeout: 30_000, maxBuffer: 1024 * 1024 });
    assert.equal(digest(readFileSync(profilePath)), digest(originalProfile));
  });
  if (realmChanged) await cleanStep('realm_fields_restored', async () => {
    await admin('PUT', '', { registrationAllowed: originalRealm.registrationAllowed,
      verifyEmail: originalRealm.verifyEmail, resetPasswordAllowed: originalRealm.resetPasswordAllowed,
      smtpServer: originalRealm.smtpServer || {} });
    const restored = await admin('GET');
    for (const key of ['registrationAllowed', 'verifyEmail', 'resetPasswordAllowed']) assert.equal(restored[key], originalRealm[key]);
    assert.deepEqual(restored.smtpServer || {}, originalRealm.smtpServer || {});
  });
  if (actionChanged) await cleanStep('required_action_restored', async () => {
    await admin('PUT', '/authentication/required-actions/VERIFY_EMAIL', originalVerifyAction);
    assert.deepEqual(await admin('GET', '/authentication/required-actions/VERIFY_EMAIL'), originalVerifyAction);
  });
  if (admin && db) for (const user of planned) await cleanStep('synthetic_' + user.label + '_removed', async () => {
    if (!user.absentBefore || !user.submitted) return;
    const record = await userRecord(user);
    if (!record) return;
    const owner = await identity(user.subject);
    if (owner) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        if (user.invited) {
          // Only this run's synthetic grant, invitation and draft rows are removed.
          await client.query('DELETE FROM academy_lesson_drafts WHERE owner_id=$1', [owner.id]);
          await client.query('DELETE FROM academy_pilot_grants WHERE identity_id=$1', [owner.id]);
          await client.query('DELETE FROM academy_pilot_invitations WHERE recipient_issuer=$1 AND recipient_subject=$2', [ISSUER, user.subject]);
        }
        assert.equal((await client.query('SELECT 1 FROM academy_pilot_grants WHERE identity_id=$1', [owner.id])).rowCount, 0);
        assert.equal((await client.query('SELECT 1 FROM academy_lesson_drafts WHERE owner_id=$1', [owner.id])).rowCount, 0);
        await client.query('DELETE FROM academy_session_revocations WHERE identity_id=$1', [owner.id]);
        await client.query('DELETE FROM academy_sessions WHERE identity_id=$1', [owner.id]);
        assert.equal((await client.query('DELETE FROM academy_identities WHERE id=$1 AND issuer=$2 AND subject=$3', [owner.id, ISSUER, user.subject])).rowCount, 1);
        await client.query('COMMIT');
      } catch { await client.query('ROLLBACK'); throw new Error('SYNTHETIC_DB_CLEANUP'); }
      finally { client.release(); }
    }
    await admin('DELETE', '/users/' + encodeURIComponent(user.subject));
    assert.equal(await userRecord(user), null);
    await noIdentity(user);
  });
  if (mail) await cleanStep('private_mail_capture_closed', () => mail.close());
  if (db) await cleanStep('database_pool_closed', () => db.end());
  adminToken = undefined;
  const status = !failure && results.length === EXPECTED_RESULTS ? 'PASS' : 'FAIL';
  if (EV) writeFileSync(join(EV, 'registration-journey-results.json'), JSON.stringify({
    schema: 'witnessops.academy.disposable-registration.v1', startedAt, finishedAt: stamp(), status,
    stage, scope: 'existing disposable Docker Keycloak 26.8.2, PostgreSQL and browser', results, cleanup,
    mail: { kind: 'in-memory SMTP capture; no relay', messages: mail?.count || 0, rawMessagesRetained: false },
    production: 'NOT_TOUCHED', externalMail: 'NOT_SENT', communityMembership: 'NOT_TESTED',
  }, null, 2) + '\n', { mode: 0o600 });
  console.log(`RESULT registration ${results.length}/${EXPECTED_RESULTS} ${status}`);
  process.exitCode = status === 'PASS' ? 0 : 1;
}
