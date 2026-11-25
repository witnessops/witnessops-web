import { CHAT_API, CHAT_DECISION_API, CHAT_LESSON_ID, CHAT_ROUTE } from './lesson-chat-routes.mjs';
import { lessonChatPage } from './lesson-chat-page.mjs';
import { readLessonChat, submitLessonDecision } from './lesson-chat-store.mjs';
import { readBody, discardAfterResponse } from './read-body.mjs';
import { invitationPage, INVITATION_PAGE_HEADERS } from './invitation-page.mjs';

const CHAT_BODY_BYTES = 2048;

/** The production server supplies its existing session, admission and CSRF guards. */
export async function handleLessonChat(req, res, path, context) {
  if (![CHAT_ROUTE, CHAT_API, CHAT_DECISION_API].includes(path)) return false;
  const { pool, getSession, canAccess, csrfError, send, communityUrl = null } = context;
  const reply = (status, body, headers) => { send(res, status, body, headers); return true; };
  const page = path === CHAT_ROUTE;
  const allowed = page ? ['GET', 'HEAD'] : path === CHAT_API ? ['GET'] : ['POST'];
  if (!allowed.includes(req.method)) return reply(405, { error: 'method_not_allowed' }, { Allow: allowed.join(', ') });

  const session = await getSession(req);
  // The signed-out shell carries no saved progress or learner data.
  if (page && !session) return reply(200, lessonChatPage(null));
  if (!session) return reply(401, { error: 'unauthenticated' });
  if (!await canAccess(session.identity_id)) return page
    ? reply(403, invitationPage(session, { denied: true, communityUrl }), INVITATION_PAGE_HEADERS)
    : reply(403, { error: 'access_required' });
  if (page) return reply(200, lessonChatPage(session, communityUrl));
  if (path === CHAT_API) {
    const result = await readLessonChat(pool, session.identity_id, CHAT_LESSON_ID);
    return reply(result.status, result.body);
  }

  const bad = csrfError(req, session);
  if (bad) return reply(403, { error: 'csrf', check: bad });
  if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(415, { error: 'json_required' });
  }
  let body;
  try {
    body = JSON.parse(await readBody(req, CHAT_BODY_BYTES));
  } catch (error) {
    if (error.status === 413) {
      reply(413, { error: 'body_too_large' });
      discardAfterResponse(res, req);
      return true;
    }
    return reply(400, { error: 'bad_json' });
  }
  const result = await submitLessonDecision(pool, session.identity_id, body);
  return reply(result.status, result.body);
}
