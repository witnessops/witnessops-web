import http from 'node:http';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { handleLessonChat } from '../src/lesson-chat-http.mjs';
import { preloadRoutes } from '../../witnessops-academy/scripts/serve.mjs';
import { createLessonChatMemoryPool } from './lesson-chat-db-fixture.mjs';
import { registerLessonChatTools } from '../../witnessops-academy-mcp/src/lesson-chat-tools.mjs';

export const CHAT_TEST_LEARNERS = Object.freeze({ a: '00000000-0000-4000-8000-000000000001', b: '00000000-0000-4000-8000-000000000002' });
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

/** Isolated loopback HTTP fixture. Session/admission boundaries are injected;
 * this is not evidence of Keycloak, OAuth, PostgreSQL grants or production TLS. */
export async function createLessonChatHttpFixture() {
  const memory = createLessonChatMemoryPool();
  const admission = new Map(Object.values(CHAT_TEST_LEARNERS).map(id => [id, true]));
  const sessions = new Map(Object.entries(CHAT_TEST_LEARNERS).map(([name, id]) => [name, { identity_id: id, csrf_token: `synthetic-${name}-csrf` }]));
  const publicRoutes = await preloadRoutes(new URL('../../witnessops-academy/public/', import.meta.url));
  for (const [path, name, type] of [
    ['/academy/static/lesson-chat.js', 'lesson-chat-client.js', 'text/javascript; charset=utf-8'],
    ['/academy/static/lesson-chat.css', 'lesson-chat.css', 'text/css; charset=utf-8'],
  ]) publicRoutes.set(path, { body: await readFile(new URL('../src/' + name, import.meta.url)), type });
  const pool = { query: async (sql, values) => sql.includes('academy_has_approved_free_grant')
    ? { rows: [{ admitted: admission.get(values[0]) === true }], rowCount: 1 } : memory.query(sql, values) };
  const handlers = new Map();
  registerLessonChatTools({ registerTool(name, _config, handler) { handlers.set(name, handler); } }, {
    db: pool, policy: 'approved-free-pilot', ownerId: async auth => auth.extra.validatedOwner,
  });
  const requests = [];
  let origin;
  function session(req) { return sessions.get((req.headers.cookie || '').match(/(?:^|;\s*)academy_fixture=([ab])(?:;|$)/)?.[1]) || null; }
  function csrfError(req, current) {
    if (req.headers.origin !== origin) return 'origin';
    if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return 'sec-fetch-site';
    const supplied = Buffer.from(req.headers['x-csrf-token'] || ''), expected = Buffer.from(current.csrf_token);
    return supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected) ? 'token' : null;
  }
  function send(res, status, body, headers = {}) {
    const json = !Buffer.isBuffer(body) && typeof body === 'object' && body !== null;
    res.writeHead(status, { 'Content-Type': json ? 'application/json' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY', 'Content-Security-Policy': CSP, ...headers });
    res.end(json ? JSON.stringify(body) : body);
  }
  const server = http.createServer((req, res) => {
    const path = new URL(req.url, origin).pathname;
    res.on('finish', () => requests.push({ method: req.method, path, status: res.statusCode }));
    (async () => {
      if (path === '/academy/auth/logout' && req.method === 'POST') {
        const current = session(req);
        if (!current) return send(res, 401, { error: 'unauthenticated' });
        if (csrfError(req, current)) return send(res, 403, { error: 'csrf' });
        for (const [name, value] of sessions) if (value === current) sessions.delete(name);
        return send(res, 200, { idp_logout: 'complete' }, { 'Set-Cookie': 'academy_fixture=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' });
      }
      if (await handleLessonChat(req, res, path, { pool, getSession: async request => session(request),
        canAccess: async id => admission.get(id) === true, csrfError, send })) return;
      const asset = publicRoutes.get(path);
      if (asset && ['GET', 'HEAD'].includes(req.method)) return send(res, 200, asset.body, { 'Content-Type': asset.type });
      send(res, 404, { error: 'not_found' });
    })().catch(() => { if (!res.headersSent) send(res, 500, { error: 'fixture_internal' }); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, memory, pool, admission, requests, sessions,
    cookie: name => ({ name: 'academy_fixture', value: name, url: origin, httpOnly: true, sameSite: 'Lax' }),
    headers: name => ({ Cookie: `academy_fixture=${name}`, Origin: origin, 'X-CSRF-Token': `synthetic-${name}-csrf`, 'Content-Type': 'application/json' }),
    mcpCall: (name, args, learner = 'a') => handlers.get(name)(args, { authInfo: { extra: { validatedOwner: CHAT_TEST_LEARNERS[learner] } } }),
    close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
