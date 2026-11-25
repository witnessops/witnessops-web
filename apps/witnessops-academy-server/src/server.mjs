// WitnessOps Academy lesson server: Keycloak OIDC sign-in and owner-scoped drafts.
// The owner always comes from the server-side session, which is bound to the validated
// ID token (iss, sub). Request bodies, queries, and headers never choose it.
// Secrets come only from *_FILE or CREDENTIALS_DIRECTORY. See src/env.mjs.
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { preloadRoutes } from '../../witnessops-academy/scripts/serve.mjs';
import { LESSON_ROUTE, lessonPage } from './lesson-page.mjs';
import { LESSONS, DEFAULT_LESSON, lessonById, lessonByAlias, lessonByRoute, lessonByDraft } from './lesson-routes.mjs';
import { accessPolicy, browserErrorBody, invitationInput, invitationPage, INVITATION_PAGE_HEADERS } from './invitation-page.mjs';
import { communityUrl } from './community-link.mjs';
import { ACCOUNT_ROUTE, accountPage, registrationEnabled } from './account-page.mjs';
import { authorizationIntent, loginDestination, registrationClaimsAccepted } from './login-intent.mjs';
import { previewInvitation, redeemInvitation, hasApprovedFreeGrant } from './pilot-invitations.mjs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as oidc from 'openid-client';
import { clientAddress } from './client-address.mjs';
import { createSessionTokenCodec, assertTokenStorageReady } from './session-tokens.mjs';
import { readSessionTokenKeyring } from './token-keyring-file.mjs';
import { publicErrorCode, validateDraft } from './draft-input.mjs';
import { idpFailureAction, idpLogoutReport } from './idp-decision.mjs';
import { assertHttpBindIsLoopback } from './listen-policy.mjs';
import { createLoginGuard, startLoginSweep } from './login-guard.mjs';
import { PREAUTH_TTL_MS, createPreauthCodec, preauthKeyFromSecret } from './preauth-cookie.mjs';
import { discardAfterResponse, readBody } from './read-body.mjs';
import { env, list, secret, int, requireHttpsOrLoopback } from './env.mjs';
import { chatPage, chatConnectionPage } from './chat-page.mjs';
import { createChatStore } from './chat-store.mjs';
import { chatLessonFromPath, createChatHandler } from './chat-http.mjs';
import { matrixWidgetOrigins, matrixWidgetResponse } from './matrix-widget-view.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSON_JS = readFileSync(join(HERE, 'lesson-client.js'));
const INVITATION_JS = readFileSync(join(HERE, 'invitation-client.js'));
const ACCOUNT_JS = readFileSync(join(HERE, 'account-client.js'));
const ACCESS_POLICY = accessPolicy(env('ACADEMY_ACCESS_POLICY', 'approved-free-pilot'));
const REQUIRES_GRANT = ACCESS_POLICY === 'approved-free-pilot';
const COMMUNITY_URL = communityUrl(env('ACADEMY_COMMUNITY_URL', ''));
// Empty by default. Only explicitly listed Element Web origins can frame Lesson 1.
const MATRIX_WIDGET_ORIGINS = matrixWidgetOrigins(env('ACADEMY_MATRIX_WIDGET_ORIGINS', ''));
const SELF_SERVICE_REGISTRATION = registrationEnabled(env('ACADEMY_SELF_SERVICE_REGISTRATION', 'false'));
const DRAFT_TEXT_JS = readFileSync(join(HERE, 'draft-text.mjs'));
const LESSON_CSS = readFileSync(join(HERE, 'lesson.css'));
const CHAT_JS = readFileSync(join(HERE, 'chat-client.js'));
const CHAT_CSS = readFileSync(join(HERE, 'chat.css'));
const PUBLIC_ROUTES = await preloadRoutes(new URL('../../witnessops-academy/public/', import.meta.url));
const LESSON_HTML = new Map(LESSONS.map(lesson => [lesson.id, PUBLIC_ROUTES.get(lesson.publicPath).body.toString()]));

const HOST = env('ACADEMY_APP_HOST', '127.0.0.1');
const PORT = int('ACADEMY_APP_PORT', 18300);
const ORIGIN = requireHttpsOrLoopback(
  'ACADEMY_PUBLIC_ORIGIN',
  env('ACADEMY_PUBLIC_ORIGIN', `http://${HOST}:${PORT}`),
).origin;
const ISSUER_URL = requireHttpsOrLoopback('ACADEMY_OIDC_ISSUER', env('ACADEMY_OIDC_ISSUER'));
const ISSUER = ISSUER_URL.href.replace(/\/$/, '');
const CLIENT_ID = env('ACADEMY_OIDC_CLIENT_ID', 'academy-app');
const CLIENT_SECRET = secret('ACADEMY_OIDC_CLIENT_SECRET');
const sessionTokens = createSessionTokenCodec(readSessionTokenKeyring(), { issuer: ISSUER, clientId: CLIENT_ID });
const SECURE = ORIGIN.startsWith('https://');
const REDIRECT_URI = `${ORIGIN}/academy/auth/callback`;
const SESSION_TTL_MS = int('ACADEMY_SESSION_TTL_SECONDS', 8 * 3600) * 1000;
const COOKIE = SECURE ? '__Host-academy_sid' : 'academy_sid';
const PRE = SECURE ? '__Host-academy_preauth' : 'academy_preauth';
const COOKIE_PATH = SECURE ? '/' : '/academy';
const DB_NAME = env('ACADEMY_DB_NAME', 'academy');
const TRUSTED_PROXIES = list('ACADEMY_TRUSTED_PROXIES', '');
const preauth = createPreauthCodec(preauthKeyFromSecret(secret('ACADEMY_PREAUTH_KEY')));
assertHttpBindIsLoopback(HOST, ORIGIN);

const pool = new pg.Pool({
  host: env('ACADEMY_DB_HOST', '127.0.0.1'),
  port: int('ACADEMY_DB_PORT', 5432),
  database: DB_NAME,
  user: env('ACADEMY_DB_USER', 'academy_app'),
  password: secret('ACADEMY_DB_PASSWORD'),
  max: int('ACADEMY_DB_POOL_MAX', 5),
});
await assertTokenStorageReady(pool);
if (REQUIRES_GRANT) {
  const migration = await pool.query("SELECT 1 FROM academy_schema_migrations WHERE version='004_academy_pilot_invitations'");
  if (migration.rowCount !== 1) throw new Error('Academy admission migration is required');
}
const IDP_TIMEOUT_MS = 5000;
async function timedFetch(url, options = {}) {
  return fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(IDP_TIMEOUT_MS) });
}
const discoveryOptions = { [oidc.customFetch]: timedFetch };
if (ISSUER_URL.protocol === 'http:') discoveryOptions.execute = [oidc.allowInsecureRequests];
const config = await oidc.discovery(
  ISSUER_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  oidc.ClientSecretPost(CLIENT_SECRET),
  discoveryOptions,
);
const END_SESSION = requireHttpsOrLoopback(
  'ACADEMY_OIDC_END_SESSION',
  config.serverMetadata().end_session_endpoint || `${ISSUER}/protocol/openid-connect/logout`,
).href;
class IdpUnavailable extends Error {
  constructor() {
    super('idp_unavailable');
    this.name = 'IdpUnavailable';
  }
}
const loginGuard = createLoginGuard();
startLoginSweep(loginGuard);
const invitationGuard = createLoginGuard();
startLoginSweep(invitationGuard);

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const rnd = (n = 32) => crypto.randomBytes(n).toString('base64url');
const log = (o) => console.log(JSON.stringify({ t: new Date().toISOString(), ...o }));
pool.on('error', (error) => {
  log({ ev: 'db_pool_error', err: publicErrorCode(error) });
});

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
const setCookie = (name, val, maxAge) =>
  `${name}=${val}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;
const CSP = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' ${ISSUER_URL.origin}`;

function send(res, status, body, headers = {}) {
  const isBytes = Buffer.isBuffer(body);
  const isObj = !isBytes && typeof body === 'object' && body !== null;
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': CSP,
    ...(SECURE ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}


async function revoke(s, reason) {
  await pool.query(
    'UPDATE academy_sessions SET revoked_at = now(), tokens_ciphertext = NULL WHERE token_hash = $1 AND revoked_at IS NULL',
    [s.token_hash],
  );
  await pool.query(
    'INSERT INTO academy_session_revocations(token_hash, identity_id, reason) VALUES ($1,$2,$3)',
    [s.token_hash, s.identity_id, reason],
  );
  log({ ev: 'session_revoked', reason, identity: s.identity_id });
}

function requestClient(req) {
  return clientAddress({
    remoteAddress: req.socket?.remoteAddress || '',
    forwardedFor: req.headers['x-forwarded-for'],
  }, TRUSTED_PROXIES);
}

async function loadLocalSession(req) {
  const tok = cookies(req)[COOKIE];
  if (!tok || !/^[A-Za-z0-9_-]{43}$/.test(tok)) return null;
  const { rows } = await pool.query('SELECT * FROM academy_sessions WHERE token_hash = $1', [sha(tok)]);
  const s = rows[0];
  if (!s || s.revoked_at || s.expires_at < new Date()) return null;
  return s;
}

async function unsealSession(s) {
  let opened;
  try { opened = sessionTokens.open(s.tokens_ciphertext, s); }
  catch {
    await revoke(s, 'token_protection_failed');
    return null;
  }
  if (opened.needsRewrap) {
    // Compare-and-set: a concurrent refresh or revocation must not be overwritten.
    await pool.query(`UPDATE academy_sessions SET tokens_ciphertext=$2
      WHERE token_hash=$1 AND tokens_ciphertext=$3 AND revoked_at IS NULL AND expires_at>now()`,
    [s.token_hash, sessionTokens.seal(opened.tokens, s), s.tokens_ciphertext]);
  }
  return { ...s, tokens: opened.tokens };
}

// Confirm the IdP session is still alive. Admin revocation and IdP logout deny the request. Fail closed.
async function getSession(req) {
  const local = await loadLocalSession(req);
  if (!local) return null;
  const s = await unsealSession(local);
  if (!s) return null;
  let active = false;
  try {
    active = (await oidc.tokenIntrospection(config, s.tokens.access_token)).active === true;
  } catch (error) {
    if (idpFailureAction(error) !== 'revoke') throw new IdpUnavailable();
    active = false;
  }
  if (!active) {
    try {
      const t = await oidc.refreshTokenGrant(config, s.tokens.refresh_token);
      const tokens = { id_token: t.id_token || s.tokens.id_token, access_token: t.access_token, refresh_token: t.refresh_token || s.tokens.refresh_token };
      const saved = await pool.query(
        'UPDATE academy_sessions SET tokens_ciphertext=$2, access_expires_at=now()+make_interval(secs=>$3) WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',
        [s.token_hash, sessionTokens.seal(tokens, s), t.expires_in || 300],
      );
      if (saved.rowCount !== 1) return null;
      s.tokens = tokens;
    } catch (error) {
      if (idpFailureAction(error) !== 'revoke') throw new IdpUnavailable();
      await revoke(s, 'idp_session_inactive');
      return null;
    }
  }
  return s;
}

// Unsafe methods need an exact Origin, a same-origin Sec-Fetch-Site when present, and the session token.
function csrfOk(req, s) {
  if (req.headers.origin !== ORIGIN) return 'origin';
  const sfs = req.headers['sec-fetch-site'];
  if (sfs && sfs !== 'same-origin') return 'sec-fetch-site';
  const presented = Buffer.from(req.headers['x-csrf-token'] || '');
  const expected = Buffer.from(s.csrf_token);
  if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) return 'token';
  return null;
}

function identityClaims(tokens) {
  const claims = tokens.claims();
  if (!claims || typeof claims.iss !== 'string' || claims.iss === '' || typeof claims.sub !== 'string' || claims.sub === '') {
    return null;
  }
  return claims;
}

async function startLogin(req, res, { lesson = DEFAULT_LESSON, invitationToken, returnTo, registration = false } = {}) {
  const decision = loginGuard.begin(requestClient(req));
  if (!decision.ok) {
    return send(res, 429, browserErrorBody(req, 'rate_limited'), { 'Retry-After': String(decision.retryAfter) });
  }
  const state = rnd();
  const nonce = rnd();
  const verifier = oidc.randomPKCECodeVerifier();
  const sealed = preauth.seal({ state, nonce, verifier, lessonId: lesson.id, invitationToken, returnTo, registration });
  const to = oidc.buildAuthorizationUrl(config, {
    redirect_uri: REDIRECT_URI,
    ...authorizationIntent(registration),
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
  });
  return send(res, 302, '', { Location: to.href, 'Set-Cookie': setCookie(PRE, sealed, PREAUTH_TTL_MS / 1000) });
}

const chatStore = createChatStore(pool);
const handleChat = createChatHandler({
  store: chatStore, getSession, csrfCheck: csrfOk, send, readBody, discardAfterResponse,
  hasAccess: owner => REQUIRES_GRANT ? hasApprovedFreeGrant(pool, { identityId: owner }) : Promise.resolve(true),
});

async function handle(req, res) {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;
  const read = req.method === 'GET' || req.method === 'HEAD';
  const alias = lessonByAlias(p);
  if (alias) return read ? send(res, 302, '', { Location: alias.route })
    : send(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD' });

  if (p === '/academy/healthz' && req.method === 'GET') return send(res, 200, { ok: true });

  if (p === ACCOUNT_ROUTE && read) {
    const s = await getSession(req);
    const admitted = s && (!REQUIRES_GRANT || await hasApprovedFreeGrant(pool, { identityId: s.identity_id }));
    return send(res, 200, accountPage(s, { registration: SELF_SERVICE_REGISTRATION, admitted, communityUrl: COMMUNITY_URL }));
  }
  if (p === '/academy/static/account.js' && read) {
    return send(res, 200, ACCOUNT_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }

  if (p === '/academy/static/lesson.js' && read) {
    return send(res, 200, LESSON_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }
  if (p === '/academy/static/draft-text.mjs' && req.method === 'GET') {
    return send(res, 200, DRAFT_TEXT_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }
  if (p === '/academy/static/lesson.css' && req.method === 'GET') {
    return send(res, 200, LESSON_CSS, { 'Content-Type': 'text/css; charset=utf-8' });
  }
  if (p === '/academy/static/chat.js' && read) {
    return send(res, 200, CHAT_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }
  if (p === '/academy/static/chat.css' && read) {
    return send(res, 200, CHAT_CSS, { 'Content-Type': 'text/css; charset=utf-8' });
  }
  if (p === '/academy/connect/chatgpt' && read) return send(res, 200, chatConnectionPage());
  const chatLesson = chatLessonFromPath(p);
  if (chatLesson) return handleChat(req, res, chatLesson);

  if (REQUIRES_GRANT && p === '/academy/invitation' && read) {
    return send(res, 200, invitationPage(await getSession(req), { failed: url.searchParams.get('status') === 'not-accepted', communityUrl: COMMUNITY_URL }), INVITATION_PAGE_HEADERS);
  }
  if (REQUIRES_GRANT && p === '/academy/static/invitation.js' && read) {
    return send(res, 200, INVITATION_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }
  if (REQUIRES_GRANT && p === '/academy/auth/invitation' && req.method === 'POST') {
    if (req.headers.origin !== ORIGIN || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) return send(res, 403, { error: 'origin' });
    if (!(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return send(res, 415, { error: 'form_required' });
    let raw;
    try { raw = await readBody(req); } catch (error) {
      if (error.status === 413) {
        send(res, 413, { error: 'body_too_large' });
        discardAfterResponse(res, req);
        return;
      }
      return send(res, 400, { error: 'invalid_invitation' });
    }
    const fields = new URLSearchParams(raw);
    const token = invitationInput({ token: fields.get('token') });
    if (fields.size !== 1 || !token) return send(res, 400, { error: 'invalid_invitation' });
    return startLogin(req, res, { invitationToken: token });
  }
  if (REQUIRES_GRANT && ['/academy/api/invitations/preview', '/academy/api/invitations/redeem'].includes(p)) {
    const s = await getSession(req);
    if (!s) return send(res, 401, { error: 'unauthenticated' });
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
    const bad = csrfOk(req, s);
    if (bad) return send(res, 403, { error: 'csrf', check: bad });
    const limit = invitationGuard.begin(requestClient(req));
    if (!limit.ok) return send(res, 429, { error: 'rate_limited' }, { 'Retry-After': String(limit.retryAfter) });
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'json_required' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch (error) {
      if (error.status === 413) {
        send(res, 413, { error: 'body_too_large' });
        discardAfterResponse(res, req);
        return;
      }
      return send(res, 400, { error: 'invalid_invitation' });
    }
    const token = invitationInput(body);
    if (!token) return send(res, 400, { error: 'invalid_invitation' });
    const result = p.endsWith('/preview') ? await previewInvitation(pool, { token, identityId: s.identity_id })
      : await redeemInvitation(pool, { token, identityId: s.identity_id });
    return send(res, result.ok ? 200 : 403, result.ok
      ? (p.endsWith('/preview') ? { eligible: true } : { accepted: true })
      : { error: 'invalid_invitation' });
  }
  if (p === '/academy/auth/login' && req.method === 'GET') {
    return startLogin(req, res, { lesson: lessonById(url.searchParams.get('lesson')) || DEFAULT_LESSON,
      returnTo: url.searchParams.get('return') === 'account' ? 'account' : undefined });
  }
  if (p === '/academy/auth/register' && req.method === 'GET') {
    if (!SELF_SERVICE_REGISTRATION) return send(res, 302, '', { Location: ACCOUNT_ROUTE });
    return startLogin(req, res, { returnTo: 'account', registration: true });
  }

  if (p === '/academy/auth/callback' && req.method === 'GET') {
    const pa = preauth.open(cookies(req)[PRE]);
    if (!pa) return send(res, 400, browserErrorBody(req, 'login_state_missing'));
    let tokens;
    try {
      tokens = await oidc.authorizationCodeGrant(config, new URL(req.url, ORIGIN), {
        pkceCodeVerifier: pa.verifier,
        expectedState: pa.state,
        expectedNonce: pa.nonce,
        idTokenExpected: true,
      });
    } catch (e) {
      log({ ev: 'callback_failed', err: publicErrorCode(e) });
      return send(res, 400, browserErrorBody(req, 'login_failed'));
    }
    const claims = identityClaims(tokens);
    if (!claims) {
      log({ ev: 'callback_failed', err: 'claims' });
      return send(res, 400, browserErrorBody(req, 'login_failed'));
    }
    if (!registrationClaimsAccepted(pa, claims)) {
      return send(res, 400, browserErrorBody(req, 'email_verification_required'));
    }
    // Identity rows are immutable for the runtime role (no UPDATE grant): insert-if-absent, then read.
    await pool.query(
      'INSERT INTO academy_identities(issuer, subject) VALUES ($1,$2) ON CONFLICT (issuer, subject) DO NOTHING',
      [claims.iss, claims.sub],
    );
    const { rows } = await pool.query(
      'SELECT id FROM academy_identities WHERE issuer = $1 AND subject = $2',
      [claims.iss, claims.sub],
    );
    if (!rows[0]) {
      log({ ev: 'callback_failed', err: 'identity' });
      return send(res, 400, browserErrorBody(req, 'login_failed'));
    }
    const sid = rnd();
    const csrf = rnd();
    const context = { token_hash: sha(sid), identity_id: rows[0].id };
    const sealed = sessionTokens.seal({ id_token: tokens.id_token, access_token: tokens.access_token, refresh_token: tokens.refresh_token }, context);
    await pool.query(
      `INSERT INTO academy_sessions(token_hash, identity_id, csrf_token, idp_session_id, tokens_ciphertext, access_expires_at, expires_at)
      VALUES ($1,$2,$3,$4,$5, now()+make_interval(secs=>$6), now()+make_interval(secs=>$7))`,
      [context.token_hash, context.identity_id, csrf, claims.sid || null, sealed, tokens.expires_in || 300, SESSION_TTL_MS / 1000],
    );
    let destination = loginDestination(pa);
    if (REQUIRES_GRANT && pa.invitationToken) {
      const result = await redeemInvitation(pool, { token: pa.invitationToken, identityId: rows[0].id });
      if (!result.ok) destination = '/academy/invitation?status=not-accepted';
    }
    log({ ev: 'login', identity: rows[0].id });
    return send(res, 302, '', {
      Location: destination,
      'Set-Cookie': [setCookie(COOKIE, sid, SESSION_TTL_MS / 1000), setCookie(PRE, '', 0)],
    });
  }

  if (p === '/academy/auth/logout' && req.method === 'POST') {
    const s = await loadLocalSession(req);
    if (!s) return send(res, 401, { error: 'unauthenticated' }, { 'Set-Cookie': setCookie(COOKIE, '', 0) });
    const bad = csrfOk(req, s);
    if (bad) return send(res, 403, { error: 'csrf', check: bad });
    let logoutTokens;
    try { logoutTokens = sessionTokens.open(s.tokens_ciphertext, s).tokens; } catch { logoutTokens = null; }
    await revoke(s, 'logout');
    let idpStatus = 0;
    try {
      if (!logoutTokens) throw new Error('session_token_protection_failed');
      const r = await fetch(END_SESSION, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: logoutTokens.refresh_token }),
      });
      idpStatus = r.status;
    } catch {
      idpStatus = 0;
    }
    let endPath = '';
    try {
      const endUrl = oidc.buildEndSessionUrl(config, {
        id_token_hint: logoutTokens?.id_token,
        post_logout_redirect_uri: `${ORIGIN}${LESSON_ROUTE}`,
      });
      endPath = endUrl.origin + endUrl.pathname;
    } catch {
      endPath = '';
    }
    const report = idpLogoutReport(idpStatus);
    log({ ev: 'logout', identity: s.identity_id, idp_logout: report.body.idp_logout });
    return send(res, report.httpStatus, { ...report.body, end_session_url: endPath }, {
      'Set-Cookie': setCookie(COOKIE, '', 0),
    });
  }

  const draftLesson = lessonByDraft(p);
  if (draftLesson) {
    const LESSON_ID = draftLesson.id;
    const s = await getSession(req);
    if (!s) return send(res, 401, { error: 'unauthenticated' });
    if (REQUIRES_GRANT && !await hasApprovedFreeGrant(pool, { identityId: s.identity_id })) return send(res, 403, { error: 'access_required' });
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        'SELECT content, version, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2',
        [s.identity_id, LESSON_ID],
      );
      return rows[0] ? send(res, 200, { lesson_id: LESSON_ID, ...rows[0] }) : send(res, 404, { error: 'no_draft', version: 0 });
    }
    if (req.method === 'PUT') {
      const bad = csrfOk(req, s);
      if (bad) return send(res, 403, { error: 'csrf', check: bad });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'json_required' });
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch (e) {
        if (e.status === 413) {
          send(res, 413, { error: 'body_too_large' });
          discardAfterResponse(res, req);
          return;
        }
        return send(res, 400, { error: 'bad_json' });
      }
      const draft = validateDraft(body);
      if (!draft.ok) {
        return send(res, draft.status, {
          error: draft.error,
          ...(draft.fields ? { fields: draft.fields } : {}),
          ...(draft.max_bytes ? { max_bytes: draft.max_bytes } : {}),
        });
      }
      const { content, expectedVersion, saveRequestId } = draft;
      let saved;
      if (expectedVersion === 0) {
        saved = await pool.query(
          `INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, version, last_save_request_id)
          VALUES ($1,$2,$3,1,$4) ON CONFLICT (owner_id, lesson_id) DO NOTHING RETURNING version, updated_at`,
          [s.identity_id, LESSON_ID, content, saveRequestId],
        );
      } else {
        saved = await pool.query(
          `UPDATE academy_lesson_drafts SET content=$3, version=version+1, last_save_request_id=$4, updated_at=now()
          WHERE owner_id=$1 AND lesson_id=$2 AND version=$5 RETURNING version, updated_at`,
          [s.identity_id, LESSON_ID, content, saveRequestId, expectedVersion],
        );
      }
      if (saved.rowCount === 1) {
        log({ ev: 'draft_saved', identity: s.identity_id, version: saved.rows[0].version });
        return send(res, 200, { lesson_id: LESSON_ID, ...saved.rows[0] });
      }
      const current = (await pool.query(
        'SELECT version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
        [s.identity_id, LESSON_ID],
      )).rows[0];
      if (current && current.last_save_request_id === saveRequestId && current.version === expectedVersion + 1) {
        return send(res, 200, { lesson_id: LESSON_ID, version: current.version, updated_at: current.updated_at, replay: true });
      }
      return send(res, 409, { error: 'version_conflict', current_version: current ? current.version : 0, updated_at: current?.updated_at });
    }
    return send(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, PUT' });
  }

  const lesson = lessonByRoute(p);
  if (lesson && read) {
    if (url.searchParams.get('format') === 'matrix') {
      // Narrow iframe exception: denials and every other Academy response keep X-Frame-Options: DENY via send().
      const widget = await matrixWidgetResponse({
        lesson, origins: MATRIX_WIDGET_ORIGINS, method: req.method, requiresGrant: REQUIRES_GRANT, secure: SECURE,
        getSession: () => getSession(req),
        hasGrant: session => hasApprovedFreeGrant(pool, { identityId: session.identity_id }),
      });
      if (widget.json) return send(res, widget.status, widget.json);
      res.writeHead(widget.status, widget.headers);
      return res.end(widget.body);
    }
    const s = await getSession(req);
    if (REQUIRES_GRANT && (!s || !await hasApprovedFreeGrant(pool, { identityId: s.identity_id }))) {
      return send(res, 403, invitationPage(s, { denied: true, lesson, communityUrl: COMMUNITY_URL }), INVITATION_PAGE_HEADERS);
    }
    return send(res, 200, url.searchParams.get('format') === 'worksheet'
      ? lessonPage(LESSON_HTML.get(lesson.id), s, lesson, COMMUNITY_URL)
      : chatPage({ session: s, lesson, communityUrl: COMMUNITY_URL }));
  }
  const resource = PUBLIC_ROUTES.get(p);
  if (resource && read) return send(res, 200, resource.body, { 'Content-Type': resource.type });
  return send(res, 404, { error: 'not_found' });
}

const server = http.createServer((req, res) => handle(req, res).catch((e) => {
  if (e instanceof IdpUnavailable) {
    log({ ev: 'idp_unavailable' });
    if (!res.headersSent) send(res, 503, browserErrorBody(req, 'idp_unavailable'));
    return;
  }
  log({ ev: 'error', err: publicErrorCode(e) });
  if (!res.headersSent) send(res, 500, browserErrorBody(req, 'internal'));
}));
server.listen(PORT, HOST, () => log({ ev: 'listening', host: HOST, port: PORT, origin: ORIGIN, db: DB_NAME }));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  log({ ev: 'shutdown', sig });
  setTimeout(() => process.exit(0), 2000).unref();
  server.close(() => pool.end().finally(() => process.exit(0)));
  server.closeAllConnections();
});
