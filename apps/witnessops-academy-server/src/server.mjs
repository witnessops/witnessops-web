// WitnessOps Academy lesson server: Keycloak OIDC sign-in and owner-scoped drafts.
// The owner always comes from the server-side session, which is bound to the validated
// ID token (iss, sub). Request bodies, queries, and headers never choose it.
// Secrets come only from *_FILE or CREDENTIALS_DIRECTORY. See src/env.mjs.
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as oidc from 'openid-client';
import { clientAddress } from './client-address.mjs';
import { publicErrorCode, validateDraft } from './draft-input.mjs';
import { idpFailureAction, idpLogoutReport } from './idp-decision.mjs';
import { assertHttpBindIsLoopback } from './listen-policy.mjs';
import { createLoginGuard, startLoginSweep } from './login-guard.mjs';
import { PREAUTH_TTL_MS, createPreauthCodec, preauthKeyFromSecret } from './preauth-cookie.mjs';
import { discardAfterResponse, readBody } from './read-body.mjs';
import { env, list, secret, int, requireHttpsOrLoopback } from './env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSON_JS = readFileSync(join(HERE, 'lesson-client.js'));
const LESSON_CSS = readFileSync(join(HERE, 'lesson.css'));

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
const SECURE = ORIGIN.startsWith('https://');
const REDIRECT_URI = `${ORIGIN}/academy/auth/callback`;
const LESSON_ROUTE = '/academy/learn/report-or-evidence';
const LESSON_ID = 'report-or-evidence';
const DRAFT_API = `/academy/api/lessons/${LESSON_ID}/draft`;
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
const CSP = `default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; form-action 'self' ${ISSUER_URL.origin}`;

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
    'UPDATE academy_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
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

// Confirm the IdP session is still alive. Admin revocation and IdP logout deny the request. Fail closed.
async function getSession(req) {
  const s = await loadLocalSession(req);
  if (!s) return null;
  let active = false;
  try {
    active = (await oidc.tokenIntrospection(config, s.access_token)).active === true;
  } catch (error) {
    if (idpFailureAction(error) !== 'revoke') throw new IdpUnavailable();
    active = false;
  }
  if (!active) {
    try {
      const t = await oidc.refreshTokenGrant(config, s.refresh_token);
      await pool.query(
        'UPDATE academy_sessions SET access_token=$2, refresh_token=$3, access_expires_at=now()+make_interval(secs=>$4) WHERE token_hash=$1',
        [s.token_hash, t.access_token, t.refresh_token || s.refresh_token, t.expires_in || 300],
      );
      s.access_token = t.access_token;
      s.refresh_token = t.refresh_token || s.refresh_token;
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

async function handle(req, res) {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname;

  if (p === '/academy/healthz' && req.method === 'GET') return send(res, 200, { ok: true });

  if (p === '/academy/static/lesson.js' && req.method === 'GET') {
    return send(res, 200, LESSON_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
  }
  if (p === '/academy/static/lesson.css' && req.method === 'GET') {
    return send(res, 200, LESSON_CSS, { 'Content-Type': 'text/css; charset=utf-8' });
  }

  if (p === '/academy/auth/login' && req.method === 'GET') {
    const decision = loginGuard.begin(requestClient(req));
    if (!decision.ok) {
      return send(res, 429, { error: 'rate_limited' }, { 'Retry-After': String(decision.retryAfter) });
    }
    const state = rnd();
    const nonce = rnd();
    const verifier = oidc.randomPKCECodeVerifier();
    const sealed = preauth.seal({ state, nonce, verifier });
    const to = oidc.buildAuthorizationUrl(config, {
      redirect_uri: REDIRECT_URI,
      scope: 'openid',
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
    });
    return send(res, 302, '', { Location: to.href, 'Set-Cookie': setCookie(PRE, sealed, PREAUTH_TTL_MS / 1000) });
  }

  if (p === '/academy/auth/callback' && req.method === 'GET') {
    const pa = preauth.open(cookies(req)[PRE]);
    if (!pa) return send(res, 400, { error: 'login_state_missing' });
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
      return send(res, 400, { error: 'login_failed' });
    }
    const claims = identityClaims(tokens);
    if (!claims) {
      log({ ev: 'callback_failed', err: 'claims' });
      return send(res, 400, { error: 'login_failed' });
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
      return send(res, 400, { error: 'login_failed' });
    }
    const sid = rnd();
    const csrf = rnd();
    await pool.query(
      `INSERT INTO academy_sessions(token_hash, identity_id, csrf_token, idp_session_id, id_token, access_token, access_expires_at, refresh_token, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6, now()+make_interval(secs=>$7), $8, now()+make_interval(secs=>$9))`,
      [sha(sid), rows[0].id, csrf, claims.sid || null, tokens.id_token, tokens.access_token, tokens.expires_in || 300, tokens.refresh_token, SESSION_TTL_MS / 1000],
    );
    log({ ev: 'login', identity: rows[0].id });
    return send(res, 302, '', {
      Location: LESSON_ROUTE,
      'Set-Cookie': [setCookie(COOKIE, sid, SESSION_TTL_MS / 1000), setCookie(PRE, '', 0)],
    });
  }

  if (p === '/academy/auth/logout' && req.method === 'POST') {
    const s = await loadLocalSession(req);
    if (!s) return send(res, 401, { error: 'unauthenticated' }, { 'Set-Cookie': setCookie(COOKIE, '', 0) });
    const bad = csrfOk(req, s);
    if (bad) return send(res, 403, { error: 'csrf', check: bad });
    await revoke(s, 'logout');
    let idpStatus = 0;
    try {
      const r = await fetch(END_SESSION, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: s.refresh_token }),
      });
      idpStatus = r.status;
    } catch {
      idpStatus = 0;
    }
    let endPath = '';
    try {
      const endUrl = oidc.buildEndSessionUrl(config, {
        id_token_hint: s.id_token,
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

  if (p === DRAFT_API) {
    const s = await getSession(req);
    if (!s) return send(res, 401, { error: 'unauthenticated' });
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

  if (p === LESSON_ROUTE && req.method === 'GET') {
    const s = await getSession(req);
    return send(res, 200, page(s));
  }
  return send(res, 404, { error: 'not_found' });
}

// Stand-in lesson page. The existing Academy lesson UI replaces it in a later ticket.
function page(s) {
  const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report or evidence? · Academy</title>
<link rel="stylesheet" href="/academy/static/lesson.css"></head><body>
<p><small>Pilot · synthetic teaching material · lesson text adapted from the Academy lesson pages</small></p>
<h1>Lesson 1 · Report or evidence?</h1>`;
  if (!s) return `${head}<p>Sign in to keep your draft between visits.</p><p><a href="/academy/auth/login">Sign in</a></p></body></html>`;
  const claims = ['The 02:00 backup run completed.', 'All 3 databases saved.', 'Restore tested.'];
  const labels = ['Evidenced', 'Only claimed', 'Contradicted'];
  return `${head}<form id="f">${claims.map((c, i) => `<fieldset><legend>${i + 1}. ${c}</legend>${labels.map((l) => `<label><input type="radio" name="l${i}" value="${l}" disabled> ${l}</label> `).join('')}<br><label>Artifact and reason<br><textarea name="r${i}" rows="2" disabled></textarea></label></fieldset>`).join('')}
<label>Limit<br><textarea name="limit" rows="2" disabled></textarea></label><p><button type="submit" disabled>Save draft</button> <span id="st" role="status"></span></p></form>
<p><button id="lo">Sign out</button></p>
<script type="application/json" id="academy-csrf">${JSON.stringify(s.csrf_token)}</script>
<script src="/academy/static/lesson.js" defer></script></body></html>`;
}

const server = http.createServer((req, res) => handle(req, res).catch((e) => {
  if (e instanceof IdpUnavailable) {
    log({ ev: 'idp_unavailable' });
    if (!res.headersSent) send(res, 503, { error: 'idp_unavailable' });
    return;
  }
  log({ ev: 'error', err: publicErrorCode(e) });
  if (!res.headersSent) send(res, 500, { error: 'internal' });
}));
server.listen(PORT, HOST, () => log({ ev: 'listening', host: HOST, port: PORT, origin: ORIGIN, db: DB_NAME }));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  log({ ev: 'shutdown', sig });
  setTimeout(() => process.exit(0), 2000).unref();
  server.close(() => pool.end().finally(() => process.exit(0)));
  server.closeAllConnections();
});
