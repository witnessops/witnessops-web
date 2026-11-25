// Actual isolated Element Web + Synapse, Keycloak, PostgreSQL and Academy MCP.
// No production URLs, operational learners, Community configuration or tokens in evidence.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';
import pg from 'pg';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const FIX = process.env;
assert.equal(FIX.GITHUB_ACTIONS, 'true');
assert.equal(FIX.ACADEMY_E2E, '1');
assert.equal(FIX.ACADEMY_CHAT_DISPOSABLE, '1');
assert.equal(FIX.ACADEMY_ACCESS_POLICY, 'session-only');
const APP = 'http://127.0.0.1:18300';
const ELEMENT = 'http://127.0.0.1:18444';
const SYNAPSE = 'http://127.0.0.1:18008';
const MCP = 'http://127.0.0.1:18500/mcp';
const ISSUER = FIX.ACADEMY_OIDC_ISSUER;
const REDIRECT = 'http://127.0.0.1:18599/callback';
assert.equal(FIX.ACADEMY_PUBLIC_ORIGIN, APP);
assert.equal(FIX.ACADEMY_MATRIX_WIDGET_ORIGINS, ELEMENT);
assert.equal(FIX.MATRIX_TEST_ELEMENT_URL, ELEMENT);
assert.equal(FIX.MATRIX_TEST_SYNAPSE_URL, SYNAPSE);
assert.equal(FIX.MCP_RESOURCE_URL, MCP);
assert.ok(ISSUER?.startsWith('http://127.0.0.1:8080/realms/academy'));
assert.match(FIX.TEST_MATRIX_ACADEMY_USERNAME, /^learner-new-[0-9a-f]{24}$/);
const kid = FIX.TEST_MATRIX_ACADEMY_USERNAME;
const academyPass = readFileSync(FIX.TEST_MATRIX_ACADEMY_PASSWORD_FILE, 'utf8').trim();
const matrixPass = readFileSync(FIX.MATRIX_TEST_PASSWORD_FILE, 'utf8').trim();
const roomId = readFileSync(FIX.MATRIX_TEST_ROOM_ID_FILE, 'utf8').trim();
// Room version 12 (Synapse default since v1.13x) IDs carry no server name.
assert.match(roomId, /^!(?:[A-Za-z0-9_-]{43}|[^\s:]+:academy-test\.invalid)$/);
const evidence = FIX.ACADEMY_TEST_EVIDENCE_DIR;
mkdirSync(evidence, { recursive: true, mode: 0o700 });
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const steps = [];
let stage = 'startup';
const record = (name, detail = {}) => { steps.push({ name, result: 'PASS', ...detail }); console.log(`PASS matrix-element ${name}`); };
const expect = baseExpect.configure({ timeout: 20_000 });
let browser, db, mcpClient, mcpTransport, elementPage;

async function mcpLogin() {
  // Dedicated HTTP cookie jar follows the actual Authorization Code + S256 PKCE
  // flow; the MCP server independently validates this token before returning data.
  const jar = new Map();
  async function request(method, target, body = undefined, headers = {}) {
    const url = new URL(target);
    assert.ok([new URL(ISSUER).origin].includes(url.origin), 'OAuth destination must be disposable Keycloak');
    const cookies = jar.get(url.host) || {};
    const result = await fetch(url, { method, redirect: 'manual', headers: {
      ...headers, ...(Object.keys(cookies).length ? { Cookie: Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ') } : {}),
    }, body, signal: AbortSignal.timeout(15000) });
    for (const item of result.headers.getSetCookie()) {
      const pair = item.split(';')[0]; const cut = pair.indexOf('=');
      if (cut > 0) cookies[pair.slice(0,cut)] = pair.slice(cut+1);
    }
    jar.set(url.host, cookies);
    return { status: result.status, location: result.headers.get('location'), text: await result.text() };
  }
  const verifier = crypto.randomBytes(32).toString('base64url');
  const state = crypto.randomBytes(20).toString('base64url');
  const authorization = new URL(`${ISSUER}/protocol/openid-connect/auth`);
  Object.entries({ response_type: 'code', client_id: 'academy-mcp-client', redirect_uri: REDIRECT,
    scope: 'openid academy-mcp', state, prompt: 'login', resource: MCP,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).forEach(([k,v]) => authorization.searchParams.set(k,v));
  const page = await request('GET', authorization);
  assert.equal(page.status, 200);
  const action = page.text.match(/id="kc-form-login"[^>]*action="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(action, 'Keycloak login form must be present');
  const login = new URL(action);
  assert.equal(login.origin, new URL(ISSUER).origin);
  const submitted = await request('POST', login, new URLSearchParams({ username: kid, password: academyPass, credentialId: '' }),
    { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.ok(submitted.location);
  const callback = new URL(submitted.location);
  assert.equal(callback.origin, new URL(REDIRECT).origin);
  assert.equal(callback.pathname, '/callback');
  assert.equal(callback.searchParams.get('state'), state);
  const tokenResponse = await request('POST', `${ISSUER}/protocol/openid-connect/token`, new URLSearchParams({
    grant_type: 'authorization_code', client_id: 'academy-mcp-client', redirect_uri: REDIRECT,
    code: callback.searchParams.get('code'), code_verifier: verifier, resource: MCP,
  }), { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.equal(tokenResponse.status, 200);
  const token = JSON.parse(tokenResponse.text).access_token;
  assert.ok(typeof token === 'string' && token.length > 100);
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
  assert.equal(claims.iss, ISSUER);
  assert.ok(claims.sub);
  mcpTransport = new StreamableHTTPClientTransport(new URL(MCP), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  mcpClient = new Client({ name: 'matrix-element-real-e2e', version: '0.1.0' });
  await mcpClient.connect(mcpTransport);
  return claims;
}

// Category-only Element probes for a blocked run: booleans, never page text,
// inputs, HTTP bodies, storage or credentials.
async function elementProbe(page) {
  const seen = async selector => page.locator(selector).first().isVisible().catch(() => false);
  return {
    login_form: await seen('#mx_LoginForm_username, input[name="username"]'),
    password_field: await seen('input[type="password"]'),
    welcome: await seen('.mx_Welcome, .mx_AuthPage'),
    error_dialog: await seen('.mx_ErrorDialog, .mx_Login_error, .mx_ServerPicker_desc .mx_ErrorMessage'),
    sso_button: await seen('.mx_SSOButton, .mx_SSOButtons'),
    room_view: await seen('.mx_RoomView'),
    widget_frame: await seen('iframe[src*="format=matrix"]'),
    unsupported_browser: await seen('.mx_UnsupportedBrowserView, .mx_CompatibilityPage'),
  };
}

async function elementLogin(page) {
  elementPage = page;
  stage = 'real Element Web room and widget: welcome';
  // Go straight to Element's login route; its welcome page renders
  // asynchronously, so an immediate visibility check there finds nothing.
  await page.goto(ELEMENT + '/#/login', { waitUntil: 'domcontentloaded' });
  const userInput = page.locator('#mx_LoginForm_username, input[name="username"], input[autocomplete="username"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  if (!(await userInput.isVisible().catch(() => false))) {
    const welcomeSignIn = page.locator('a[href="#/login"]').first();
    if (await welcomeSignIn.isVisible().catch(() => false)) await welcomeSignIn.click();
  }
  stage = 'real Element Web room and widget: login form';
  await expect(userInput).toBeVisible({ timeout: 40_000 });
  await userInput.fill('academy-learner');
  const password = page.locator('#mx_LoginForm_password, input[type="password"]').first();
  await password.fill(matrixPass);
  const submit = page.getByRole('button', { name: /^sign in$|^log in$/i }).last();
  stage = 'real Element Web room and widget: login submit';
  await submit.click();
  await expect(userInput).toBeHidden({ timeout: 50_000 });
  stage = 'real Element Web room and widget: room widget';
  const roomUrl = `${ELEMENT}/#/room/${encodeURIComponent(roomId)}`;
  await page.goto(roomUrl, { waitUntil: 'domcontentloaded' });
  // The room state contains one opt-in widget. If Element leaves it collapsed,
  // open its visible title in the room. Never use Matrix room data for Academy auth.
  const frame = page.locator('iframe[src*="format=matrix"]').first();
  // The pinned widget renders asynchronously after the room view. Wait for it
  // first; only then try the collapsed-title fallback, with a short bounded click
  // (an unbounded click on a moving header can outlast the frame wait).
  await frame.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  if (!(await frame.isVisible().catch(() => false))) {
    const widget = page.getByText('Academy Decision Room', { exact: true }).first();
    if (await widget.isVisible().catch(() => false)) await widget.click({ timeout: 5_000 }).catch(() => {});
  }
  await expect(frame).toBeVisible({ timeout: 45_000 });
  return frame;
}

try {
  stage = 'disposable Academy Keycloak sign-in';
  db = new pg.Client({ host: '127.0.0.1', port: 5432, database: FIX.ACADEMY_DB_NAME,
    user: FIX.ACADEMY_TEST_PGADMIN_USER, password: readFileSync(FIX.ACADEMY_TEST_PGADMIN_PASSWORD_FILE, 'utf8').trim(),
    statement_timeout: 5000, query_timeout: 10000 });
  await db.connect();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 880 } });
  const academy = await context.newPage();
  await academy.goto(APP + '/academy/learn/report-or-evidence');
  await academy.locator('#sign-in').click();
  await expect(academy.locator('#username')).toBeVisible();
  await academy.locator('#username').fill(kid);
  await academy.locator('#password').fill(academyPass);
  await academy.locator('#kc-login').click();
  await expect(academy).toHaveURL(APP + '/academy/learn/report-or-evidence');
  await expect(academy.locator('#chat-status')).toContainText(/Ready when you are/);
  const academyCookie = (await context.cookies()).find(c => c.name === 'academy_sid');
  assert.ok(academyCookie);
  const userRow = await db.query('SELECT i.id, i.subject FROM academy_sessions s JOIN academy_identities i ON s.identity_id=i.id WHERE s.token_hash=$1 AND s.revoked_at IS NULL', [sha(academyCookie.value)]);
  assert.equal(userRow.rowCount, 1);
  const ownerId = userRow.rows[0].id;
  record('real Keycloak login and server-held Academy identity');

  stage = 'real Element Web room and widget';
  const element = await context.newPage();
  const iframe = await elementLogin(element);
  record('real Element Web displays widget in disposable private Matrix room');
  const frame = iframe.contentFrame();
  await expect(frame.locator('#empty-title')).toContainText(/ready to start/i);
  await expect(frame.locator('#start')).toBeVisible();
  const before = await db.query('SELECT content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [ownerId,'chat-report-or-evidence']);
  assert.equal(before.rowCount, 0);
  record('iframe read creates no case before explicit learner action');

  stage = 'Element UI creates a private case';
  await frame.locator('#start').click();
  await expect(frame.locator('#case')).toBeVisible();
  await expect(frame.locator('#sync')).toContainText('REVISION 1');
  const first = await academy.request.get(APP + '/academy/api/lessons/report-or-evidence/chat');
  assert.equal(first.status(), 200);
  const caseState = await first.json();
  assert.equal(caseState.version, 1);
  assert.equal(caseState.lesson_id, 'report-or-evidence');
  const attemptHash = sha(caseState.attempt_id);
  record('Element UI explicitly starts the Academy-owned case', { attempt_sha256: attemptHash, revision: 1 });

  stage = 'Element UI saves one decision';
  await frame.locator('#choices input[type="radio"]').first().check();
  await frame.locator('#commit').click();
  await expect(frame.locator('#sync')).toContainText('REVISION 2');
  const check = await academy.request.get(APP + '/academy/api/lessons/report-or-evidence/chat');
  assert.equal(check.status(), 200);
  const current = await check.json();
  assert.equal(current.attempt_id, caseState.attempt_id);
  assert.equal(current.version, 2);
  record('Academy sees the exact saved Element decision revision', { attempt_sha256: attemptHash, revision: 2 });

  stage = 'independent MCP authenticated read';
  const claims = await mcpLogin();
  assert.equal(claims.sub, userRow.rows[0].subject, 'MCP identity must equal Academy session issuer/subject');
  const mcpReply = await mcpClient.callTool({ name: 'resume_lesson', arguments: { lesson_id: 'report-or-evidence' } }, undefined, { timeout: 15000 });
  assert.equal(mcpReply.isError, undefined);
  const state = mcpReply.structuredContent ?? JSON.parse(mcpReply.content.find(x => x.type === 'text').text);
  assert.equal(state.attempt_id, caseState.attempt_id);
  assert.equal(state.version, 2);
  assert.deepEqual(state.messages, current.messages);
  record('ChatGPT-compatible MCP client reads exact same authenticated case and revision', { attempt_sha256: attemptHash, revision: 2 });

  stage = 'persisted store and same-site controls';
  const row = await db.query('SELECT version, content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [ownerId, 'chat-report-or-evidence']);
  assert.equal(row.rowCount, 1);
  assert.equal(row.rows[0].version, 2);
  assert.equal(JSON.parse(row.rows[0].content).attempt.attempt_id, caseState.attempt_id);
  const header = await academy.request.get(APP + '/academy/learn/report-or-evidence?format=matrix');
  assert.equal(header.status(), 200);
  assert.ok((header.headers()['content-security-policy'] ?? '').includes('frame-ancestors http://127.0.0.1:18444'));
  assert.equal(header.headers()['x-frame-options'], undefined);
  const ordinary = await academy.request.get(APP + '/academy/learn/report-or-evidence');
  assert.equal(ordinary.headers()['x-frame-options'], 'DENY');
  record('single PostgreSQL progress record; scoped embedding policy; other routes remain denied');

  const publicReceipt = { profile: 'disposable-element-web-keycloak-postgres-mcp',
    at: new Date().toISOString(), repo_head: FIX.GITHUB_SHA || null,
    element: 'v1.12.35', matrix_server: 'v1.165.0',
    lesson: 'report-or-evidence', attempt_sha256: attemptHash,
    revision: current.version, checks: steps, limits: ['Native ChatGPT UI not tested; real MCP SDK used.','Disposable Matrix room is not production Community.'] };
  writeFileSync(join(evidence,'matrix-element-one-case.json'), JSON.stringify(publicReceipt,null,2));
  console.log(`RESULT: ${steps.length}/${steps.length} PASS — disposable Element Web / Academy / MCP same case`);
} catch (error) {
  const safe = error?.name === 'AssertionError' ? 'assertion' : error?.name === 'TimeoutError' ? 'timeout' : 'runtime';
  console.error(`BLOCKED matrix-element stage=${stage}; category=${safe}; completed_checks=${steps.length}`);
  if (elementPage && stage.startsWith('real Element Web')) {
    // Bounded: a hung page must never delay the cleanup in finally.
    const probe = await Promise.race([
      elementProbe(elementPage),
      new Promise(resolve => setTimeout(resolve, 5000, null).unref()),
    ]).catch(() => null);
    if (probe) console.error(`BLOCKED matrix-element element_probe=${JSON.stringify(probe)}`);
  }
  // Do not dump HTTP bodies, login pages, passwords, tokens or browser storage.
  process.exitCode = 1;
} finally {
  if (mcpClient) await mcpClient.close().catch(() => {});
  if (mcpTransport) await mcpTransport.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (db) await db.end().catch(() => {});
}
