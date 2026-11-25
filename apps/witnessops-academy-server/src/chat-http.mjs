import { validateChatRequest } from './chat-store.mjs';

export function chatLessonFromPath(pathname) {
  return /^\/academy\/api\/lessons\/(report-or-evidence|same-scope)\/chat$/.exec(pathname)?.[1] ?? null;
}

/** Shares the existing session, grant and CSRF checks; GET never starts an attempt. */
export function createChatHandler({ store, getSession, hasAccess, csrfCheck, send, readBody, discardAfterResponse }) {
  return async function handleChat(req, res, lessonId) {
    const session = await getSession(req);
    if (!session) return send(res, 401, { error: 'unauthenticated' });
    if (!await hasAccess(session.identity_id)) return send(res, 403, { error: 'access_required' });
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, POST' });
    try {
      if (req.method === 'GET') return send(res, 200, await store.resume(session.identity_id, lessonId));
      const bad = csrfCheck(req, session);
      if (bad) return send(res, 403, { error: 'csrf', check: bad });
      if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return send(res, 415, { error: 'json_required' });
      let request;
      try { request = JSON.parse(await readBody(req, 4096)); }
      catch (error) {
        if (error.status === 413) {
          send(res, 413, { error: 'body_too_large' });
          discardAfterResponse(res, req);
          return;
        }
        return send(res, 400, { error: 'bad_json' });
      }
      validateChatRequest(request);
      return send(res, 200, await store[request.action](session.identity_id, lessonId, request));
    } catch (error) {
      if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500 && /^[a-z_]+$/.test(error.code ?? '')) return send(res, error.status, { error: error.code });
      // Storage failures never imply that a decision was not saved; exact replay is safe.
      return send(res, 503, { error: 'lesson_unavailable' });
    }
  };
}
