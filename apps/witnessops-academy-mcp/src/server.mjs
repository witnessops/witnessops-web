// WitnessOps Academy MCP server.
// Streamable HTTP resource server. Keycloak is the authorization server.
// The learner is only the validated access token's issuer and subject.
// Tool arguments cannot select an owner. Saved learner text is data.
// Secrets come from *_FILE or CREDENTIALS_DIRECTORY. See src/env.mjs.
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as jose from 'jose';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { loadCurriculum } from './curriculum.mjs';
import { env, secret, bool, int, list, requireHttpsOrLoopback } from './env.mjs';
import { assertHttpBindIsLoopback } from './listen-policy.mjs';
import { MAX_BODY_BYTES, MAX_TEXT_BYTES } from './limits.mjs';
import { SERVER_INSTRUCTIONS, toolByName } from './tools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const HOST = env('MCP_HOST', '127.0.0.1');
const PORT = int('MCP_PORT', 18500);
const RESOURCE_URL = requireHttpsOrLoopback('MCP_RESOURCE_URL', env('MCP_RESOURCE_URL', `http://${HOST}:${PORT}/mcp`));
const RESOURCE = RESOURCE_URL.href;
const ORIGIN = RESOURCE_URL.origin;
const MCP_PATH = RESOURCE_URL.pathname;
const PRM_PATH = `/.well-known/oauth-protected-resource${MCP_PATH}`;
const ALLOWED_HOSTS = new Set(list('MCP_ALLOWED_HOSTS', RESOURCE_URL.host));
const ALLOWED_ORIGINS = new Set(list('MCP_ALLOWED_ORIGINS', ORIGIN));
const ISSUER = requireHttpsOrLoopback('ACADEMY_OIDC_ISSUER', env('ACADEMY_OIDC_ISSUER')).href.replace(/\/$/, '');
const JWKS_URL = requireHttpsOrLoopback('MCP_JWKS_URL', env('MCP_JWKS_URL', `${ISSUER}/protocol/openid-connect/certs`)).href;
const INTROSPECTION_URL = requireHttpsOrLoopback('MCP_INTROSPECTION_URL', env('MCP_INTROSPECTION_URL', `${ISSUER}/protocol/openid-connect/token/introspect`)).href;
const REQUIRED_SCOPE = env('MCP_REQUIRED_SCOPE', 'academy-mcp');
const ALLOWED_CLIENTS = new Set(list('MCP_ALLOWED_CLIENTS', 'academy-mcp-client'));
const INTROSPECT = bool('MCP_INTROSPECT', true);
const RS_CLIENT_ID = env('MCP_INTROSPECTION_CLIENT_ID', 'academy-mcp-rs');
const RS_SECRET = INTROSPECT ? secret('MCP_INTROSPECTION_CLIENT_SECRET') : null;
const SESSION_IDLE_MS = int('MCP_SESSION_IDLE_SECONDS', 1800) * 1000;
const MAX_SESSIONS = int('MCP_MAX_SESSIONS', 200);
const DB_NAME = env('ACADEMY_DB_NAME', 'academy');
const CURRICULUM_DIR = path.resolve(PACKAGE_ROOT, env('MCP_CURRICULUM_DIR', 'curriculum'));
const RESOURCE_NAME = env('MCP_RESOURCE_NAME', 'WitnessOps Academy');
const IDP_TIMEOUT_MS = int('MCP_IDP_TIMEOUT_MS', 5000);

for (const value of [RESOURCE, ORIGIN, PRM_PATH, REQUIRED_SCOPE, RESOURCE_NAME]) {
  if (/["\\\r\n]/.test(value)) throw new Error('MCP metadata contains a character that cannot go in a header');
}
assertHttpBindIsLoopback(HOST, RESOURCE);

const pool = new pg.Pool({
  host: env('ACADEMY_DB_HOST', '127.0.0.1'),
  port: int('ACADEMY_DB_PORT', 5432),
  database: DB_NAME,
  user: env('ACADEMY_DB_USER', 'academy_app'),
  password: secret('ACADEMY_DB_PASSWORD'),
  max: int('ACADEMY_DB_POOL_MAX', 5),
});
const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL), { cooldownDuration: 30_000, cacheMaxAge: 600_000 });
const LESSONS = loadCurriculum(CURRICULUM_DIR);

const log = (entry) => {
  const line = JSON.stringify({ t: new Date().toISOString(), ...entry });
  console.log(line.replace(new RegExp('ey' + 'J' + '[A-Za-z0-9_-]+', 'g'), '[REDACTED]'));
};
const h16 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
const PRM = {
  resource: RESOURCE,
  authorization_servers: [ISSUER],
  scopes_supported: [REQUIRED_SCOPE],
  bearer_methods_supported: ['header'],
  resource_name: RESOURCE_NAME,
};

function send(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

function challenge(res, status, error, description) {
  const parts = [`resource_metadata="${ORIGIN}${PRM_PATH}"`, `scope="${REQUIRED_SCOPE}"`];
  if (error) parts.push(`error="${error}"`, `error_description="${description}"`);
  return send(res, status, {
    error: error || 'unauthorized',
    error_description: description || 'Bearer token required',
  }, { 'WWW-Authenticate': `Bearer ${parts.join(', ')}` });
}

function audienceIncludesResource(audience) {
  if (audience == null) return true;
  const values = Array.isArray(audience) ? audience : [audience];
  return values.includes(RESOURCE);
}

async function authenticate(req) {
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(req.headers.authorization || '');
  if (!match) return { ok: false, status: 401, why: 'missing_token' };
  const token = match[1];
  let claims;
  try {
    ({ payload: claims } = await jose.jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: RESOURCE,
      algorithms: ['RS256', 'PS256', 'ES256'],
      clockTolerance: 5,
      requiredClaims: ['exp', 'iat', 'sub'],
    }));
  } catch (error) {
    return { ok: false, status: 401, error: 'invalid_token', why: error.code || 'jwt_invalid' };
  }
  if (claims.typ !== 'Bearer') return { ok: false, status: 401, error: 'invalid_token', why: 'not_access_token' };
  if (typeof claims.sub !== 'string' || claims.sub === '') {
    return { ok: false, status: 401, error: 'invalid_token', why: 'subject_missing' };
  }
  if (!ALLOWED_CLIENTS.has(claims.azp)) return { ok: false, status: 401, error: 'invalid_token', why: 'client_not_allowed' };
  const scopes = String(claims.scope || '').split(' ').filter(Boolean);
  if (!scopes.includes(REQUIRED_SCOPE)) return { ok: false, status: 403, error: 'insufficient_scope', why: 'scope_missing' };
  if (INTROSPECT) {
    let active = false;
    let why = 'inactive';
    try {
      const response = await fetch(INTROSPECTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: RS_CLIENT_ID,
          client_secret: RS_SECRET,
          token,
          token_type_hint: 'access_token',
        }),
        signal: AbortSignal.timeout(IDP_TIMEOUT_MS),
      });
      const body = response.ok ? await response.json() : {};
      if (body.active !== true) why = 'inactive';
      else if (body.sub !== claims.sub) why = 'inactive_subject';
      else if (body.iss !== undefined && body.iss !== claims.iss) why = 'inactive_issuer';
      else if (!audienceIncludesResource(body.aud)) why = 'inactive_audience';
      else {
        active = true;
        why = '';
      }
    } catch {
      active = false;
      why = 'inactive';
    }
    if (!active) return { ok: false, status: 401, error: 'invalid_token', why };
  }
  return {
    ok: true,
    auth: {
      token,
      clientId: claims.azp,
      scopes,
      expiresAt: claims.exp,
      resource: new URL(RESOURCE),
      extra: { iss: claims.iss, sub: claims.sub },
    },
  };
}

async function ownerId(auth) {
  const iss = auth?.extra?.iss;
  const sub = auth?.extra?.sub;
  if (typeof iss !== 'string' || typeof sub !== 'string' || iss === '' || sub === '') {
    throw Object.assign(new Error('missing_token_subject'), { status: 401 });
  }
  await pool.query(
    'INSERT INTO academy_identities(issuer, subject) VALUES ($1,$2) ON CONFLICT (issuer, subject) DO NOTHING',
    [iss, sub],
  );
  const found = await pool.query(
    'SELECT id FROM academy_identities WHERE issuer = $1 AND subject = $2',
    [iss, sub],
  );
  return found.rows[0].id;
}

const ok = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }], structuredContent: obj });
const fail = (obj) => ({ isError: true, content: [{ type: 'text', text: JSON.stringify(obj) }], structuredContent: obj });

function buildServer() {
  const server = new McpServer({ name: 'witnessops-academy', version: '0.1.0' }, { instructions: SERVER_INSTRUCTIONS });
  const listLessons = toolByName('list_lessons');
  const getLesson = toolByName('get_lesson');
  const getAnswer = toolByName('get_my_answer');
  const saveAnswer = toolByName('save_answer');
  server.registerTool(listLessons.name, {
    title: listLessons.title,
    description: listLessons.description,
    inputSchema: listLessons.inputSchema,
    annotations: listLessons.annotations,
  }, async () => ok({
    lessons: [...LESSONS.values()].map(({ id, title, path: lessonPath, position }) => ({
      id,
      title,
      path: lessonPath,
      position,
    })),
  }));
  server.registerTool(getLesson.name, {
    title: getLesson.title,
    description: getLesson.description,
    inputSchema: getLesson.inputSchema,
    annotations: getLesson.annotations,
  }, async ({ lesson_id: lessonId }) => (
    LESSONS.has(lessonId) ? ok({ lesson: LESSONS.get(lessonId) }) : fail({ error: 'unknown_lesson', status: 404 })
  ));
  server.registerTool(getAnswer.name, {
    title: getAnswer.title,
    description: getAnswer.description,
    inputSchema: getAnswer.inputSchema,
    annotations: getAnswer.annotations,
  }, async ({ lesson_id: lessonId }, extra) => {
    if (!LESSONS.has(lessonId)) return fail({ error: 'unknown_lesson', status: 404 });
    const owner = await ownerId(extra.authInfo);
    const { rows } = await pool.query(
      'SELECT content, version, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2',
      [owner, lessonId],
    );
    log({ ev: 'tool', tool: 'get_my_answer', identity: owner, found: Boolean(rows[0]) });
    return rows[0]
      ? ok({ lesson_id: lessonId, found: true, text: rows[0].content, version: rows[0].version, updated_at: rows[0].updated_at })
      : ok({ lesson_id: lessonId, found: false, version: 0 });
  });
  server.registerTool(saveAnswer.name, {
    title: saveAnswer.title,
    description: saveAnswer.description,
    inputSchema: saveAnswer.inputSchema,
    annotations: saveAnswer.annotations,
  }, async ({ lesson_id: lessonId, text, expected_version: expectedVersion }, extra) => {
    if (!LESSONS.has(lessonId)) return fail({ error: 'unknown_lesson', status: 404 });
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > MAX_TEXT_BYTES) return fail({ error: 'content_too_large', status: 413, max_bytes: MAX_TEXT_BYTES, bytes });
    const owner = await ownerId(extra.authInfo);
    const requestId = crypto.randomUUID();
    const saved = expectedVersion === 0
      ? await pool.query(
        `INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, version, last_save_request_id)
          VALUES ($1,$2,$3,1,$4) ON CONFLICT (owner_id, lesson_id) DO NOTHING RETURNING version, updated_at`,
        [owner, lessonId, text, requestId],
      )
      : await pool.query(
        `UPDATE academy_lesson_drafts SET content=$3, version=version+1, last_save_request_id=$4, updated_at=now()
          WHERE owner_id=$1 AND lesson_id=$2 AND version=$5 RETURNING version, updated_at`,
        [owner, lessonId, text, requestId, expectedVersion],
      );
    if (saved.rowCount === 1) {
      log({ ev: 'tool', tool: 'save_answer', identity: owner, version: saved.rows[0].version });
      return ok({ lesson_id: lessonId, saved: true, version: saved.rows[0].version, updated_at: saved.rows[0].updated_at, bytes });
    }
    const current = (await pool.query(
      'SELECT version, updated_at FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
      [owner, lessonId],
    )).rows[0];
    log({ ev: 'tool', tool: 'save_answer', identity: owner, conflict: true });
    return fail({
      error: 'version_conflict',
      status: 409,
      expected_version: expectedVersion,
      current_version: current ? current.version : 0,
      updated_at: current?.updated_at,
    });
  });
  return server;
}

const sessions = new Map();
function reap() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.last > SESSION_IDLE_MS) {
      session.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}
setInterval(reap, 60_000).unref();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 421, { error: 'misdirected_request' });
  const url = new URL(req.url, ORIGIN);
  const pathname = url.pathname;
  if (req.method === 'GET' && (pathname === PRM_PATH || pathname === '/.well-known/oauth-protected-resource')) {
    return send(res, 200, PRM, { 'Cache-Control': 'max-age=300' });
  }
  if (req.method === 'GET' && pathname === '/healthz') {
    try {
      await pool.query('SELECT 1');
      return send(res, 200, { ok: true, db: DB_NAME, introspect: INTROSPECT });
    } catch {
      log({ ev: 'health_db', err: 'unavailable' });
      return send(res, 503, { ok: false });
    }
  }
  if (pathname !== MCP_PATH) return send(res, 404, { error: 'not_found' });
  if (req.headers.origin && !ALLOWED_ORIGINS.has(req.headers.origin)) return send(res, 403, { error: 'origin_not_allowed' });

  const auth = await authenticate(req);
  if (!auth.ok) {
    log({ ev: 'auth_denied', why: auth.why, status: auth.status });
    return challenge(res, auth.status, auth.error, auth.why);
  }
  const { iss, sub } = auth.auth.extra;
  req.auth = auth.auth;

  let body;
  if (req.method === 'POST') {
    try {
      body = JSON.parse(await readBody(req));
    } catch (error) {
      return send(res, error.status || 400, {
        jsonrpc: '2.0',
        error: { code: -32700, message: error.status ? 'body too large' : 'parse error' },
        id: null,
      });
    }
  }
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.iss !== iss || session.sub !== sub) {
      log({ ev: 'session_rejected', known: Boolean(session) });
      return send(res, 404, { jsonrpc: '2.0', error: { code: -32001, message: 'Session not found' }, id: null });
    }
    session.last = Date.now();
    return session.transport.handleRequest(req, res, body);
  }
  if (req.method !== 'POST' || !isInitializeRequest(body)) {
    return send(res, 400, { jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: no valid session' }, id: null });
  }
  if (sessions.size >= MAX_SESSIONS) reap();
  if (sessions.size >= MAX_SESSIONS) return send(res, 503, { error: 'too_many_sessions' });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomBytes(32).toString('base64url'),
    enableJsonResponse: true,
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, iss, sub, last: Date.now() });
      log({ ev: 'session_open', sub: h16(sub) });
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
      log({ ev: 'session_closed' });
    },
  });
  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
  };
  await buildServer().connect(transport);
  return transport.handleRequest(req, res, body);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    log({ ev: 'error', err: error.code || error.name || 'internal' });
    if (!res.headersSent) send(res, 500, { error: 'internal' });
  });
});
server.listen(PORT, HOST, () => log({
  ev: 'listening',
  host: HOST,
  port: PORT,
  resource: RESOURCE,
  db: DB_NAME,
  introspect: INTROSPECT,
  lessons: [...LESSONS.keys()],
}));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log({ ev: 'shutdown', sig: signal });
    setTimeout(() => process.exit(0), 2000).unref();
    for (const session of sessions.values()) session.transport.close().catch(() => {});
    server.close(() => pool.end().finally(() => process.exit(0)));
    server.closeAllConnections();
  });
}
