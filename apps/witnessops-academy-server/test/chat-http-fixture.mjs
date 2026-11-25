import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createChatHandler } from '../src/chat-http.mjs';
import { readBody, discardAfterResponse } from '../src/read-body.mjs';
import { OWNER_A, OWNER_B } from './chat-fixture.mjs';

/** Executes the real HTTP handler/body parser with synthetic session/admission resolution. */
export function httpFixture(store) {
  const admitted = new Set([OWNER_A, OWNER_B]);
  const handle = createChatHandler({
    store, readBody, discardAfterResponse,
    getSession: async req => [OWNER_A, OWNER_B].includes(req.headers['fixture-session']) ? { identity_id: req.headers['fixture-session'], csrf_token: 'fixture-csrf' } : null,
    hasAccess: async owner => admitted.has(owner),
    csrfCheck: (req, session) => req.headers.origin !== 'http://127.0.0.1:3003' ? 'origin' : req.headers['x-csrf-token'] !== session.csrf_token ? 'token' : null,
    send: (res, status, body, headers = {}) => { res.result = { status, body, headers }; res.emit('finish'); return res.result; },
  });
  return { admitted, async request({ method = 'GET', owner = OWNER_A, body, headers = {}, lesson = 'report-or-evidence', raw } = {}) {
    const req = Readable.from([Buffer.from(raw ?? (body ? JSON.stringify(body) : ''))]);
    req.method = method;
    req.headers = { 'fixture-session': owner, origin: 'http://127.0.0.1:3003', 'x-csrf-token': 'fixture-csrf', 'content-type': 'application/json', ...headers };
    const res = new EventEmitter();
    await handle(req, res, lesson);
    return res.result;
  } };
}
