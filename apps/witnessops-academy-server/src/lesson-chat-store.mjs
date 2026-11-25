import {
  LESSON_CHAT_ID, LESSON_CHAT_REVISION, LESSON_CHAT_STORAGE_KEY,
  LessonChatError, advanceLessonChat, parseLessonChatDecisions, projectLessonChat,
} from './lesson-chat-engine.mjs';

const SCHEMA = 'witnessops.academy.lesson-chat.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_KEYS = ['lesson_id', 'step_id', 'option_id', 'expected_version', 'request_id'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => record(value)
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));

export function validateLessonChatRequest(value) {
  if (!exactKeys(value, REQUEST_KEYS)
    || typeof value.lesson_id !== 'string'
    || !['judgment', 'verification', 'closure'].includes(value.step_id)
    || typeof value.option_id !== 'string'
    || !/^[a-z_]{1,64}$/.test(value.option_id)
    || !Number.isSafeInteger(value.expected_version)
    || value.expected_version < 0 || value.expected_version > 2147483646
    || typeof value.request_id !== 'string' || !UUID.test(value.request_id)) {
    return { ok: false, status: 400, error: 'invalid_fields' };
  }
  if (value.lesson_id !== LESSON_CHAT_ID) return { ok: false, status: 404, error: 'unknown_lesson' };
  return { ok: true, request: {
    lesson_id: value.lesson_id, step_id: value.step_id, option_id: value.option_id,
    expected_version: value.expected_version, request_id: value.request_id.toLowerCase(),
  } };
}

function error(status, code, extra = {}) {
  return { status, body: { error: code, ...extra } };
}

function ownerValid(owner) {
  // This is only input hygiene. The caller must derive the owner from its
  // validated session/token and run the current admission check before calling.
  return typeof owner === 'string' && UUID.test(owner);
}

function parseRow(row) {
  if (!row) return { decisions: [], requests: [], version: 0, updated_at: null, lastRequest: null };
  let value;
  try { value = JSON.parse(row.content); } catch { return null; }
  if (!exactKeys(value, ['schema', 'lesson_id', 'revision', 'decisions', 'requests', 'last_request'])
    || value.schema !== SCHEMA || value.lesson_id !== LESSON_CHAT_ID || value.revision !== LESSON_CHAT_REVISION) return null;
  const decisions = parseLessonChatDecisions(value.decisions);
  const last = validateLessonChatRequest(value.last_request);
  if (!decisions || decisions.length === 0 || !last.ok
    || !Array.isArray(value.requests) || value.requests.length !== decisions.length
    || !Number.isSafeInteger(row.version) || row.version !== decisions.length
    || last.request.expected_version !== row.version - 1
    || row.last_save_request_id !== last.request.request_id) return null;
  const finalDecision = decisions.at(-1);
  if (last.request.step_id !== finalDecision.step_id || last.request.option_id !== finalDecision.option_id) return null;
  const requests = [];
  const seenIds = new Set();
  for (let index = 0; index < value.requests.length; index += 1) {
    const parsed = validateLessonChatRequest(value.requests[index]);
    if (!parsed.ok || parsed.request.expected_version !== index
      || parsed.request.step_id !== decisions[index].step_id
      || parsed.request.option_id !== decisions[index].option_id
      || seenIds.has(parsed.request.request_id)) return null;
    seenIds.add(parsed.request.request_id);
    requests.push(parsed.request);
  }
  if (!sameRequest(requests.at(-1), last.request)) return null;
  const timestamp = row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at;
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) return null;
  return { decisions, requests, version: row.version, updated_at: timestamp, lastRequest: last.request };
}

async function load(pool, ownerId) {
  const { rows } = await pool.query(
    'SELECT content, version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2',
    [ownerId, LESSON_CHAT_STORAGE_KEY],
  );
  return parseRow(rows[0]);
}

function projection(state) {
  return { status: 200, body: projectLessonChat(state.decisions, {
    version: state.version, updated_at: state.updated_at, saved: state.version > 0,
  }) };
}

const sameRequest = (left, right) => REQUEST_KEYS.every(key => left[key] === right[key]);

function replayOrConflict(state, request) {
  if (!state) return error(409, 'saved_progress_unrecognized');
  const known = state.requests.find(item => item.request_id === request.request_id);
  if (known) {
    if (!sameRequest(known, request)) return error(409, 'request_id_conflict', { current_version: state.version });
    if (state.lastRequest?.request_id === request.request_id) return projection(state);
  }
  return error(409, 'version_conflict', { current_version: state.version });
}

/** A read never creates or replaces progress, including an unknown saved format. */
export async function readLessonChat(pool, ownerId, lessonId = LESSON_CHAT_ID) {
  if (!ownerValid(ownerId)) return error(401, 'unauthenticated');
  if (lessonId !== LESSON_CHAT_ID) return error(404, 'unknown_lesson');
  const state = await load(pool, ownerId);
  return state ? projection(state) : error(409, 'saved_progress_unrecognized');
}

/** The authenticated owner is never accepted as part of a learner's request. */
export async function submitLessonDecision(pool, ownerId, input) {
  if (!ownerValid(ownerId)) return error(401, 'unauthenticated');
  const parsed = validateLessonChatRequest(input);
  if (!parsed.ok) return error(parsed.status, parsed.error);
  const { request } = parsed;
  const state = await load(pool, ownerId);
  if (!state) return error(409, 'saved_progress_unrecognized');
  if (state.requests.some(item => item.request_id === request.request_id) || request.expected_version !== state.version) {
    return replayOrConflict(state, request);
  }
  let decisions;
  try {
    decisions = advanceLessonChat(state.decisions, { step_id: request.step_id, option_id: request.option_id });
  } catch (cause) {
    if (!(cause instanceof LessonChatError)) throw cause;
    return error(cause.status, cause.code, { current_version: state.version });
  }
  const content = JSON.stringify({
    schema: SCHEMA, lesson_id: LESSON_CHAT_ID, revision: LESSON_CHAT_REVISION,
    decisions, requests: [...state.requests, request], last_request: request,
  });
  const saved = request.expected_version === 0
    ? await pool.query(
      `INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, version, last_save_request_id)
        VALUES ($1,$2,$3,1,$4) ON CONFLICT (owner_id, lesson_id) DO NOTHING RETURNING version, updated_at`,
      [ownerId, LESSON_CHAT_STORAGE_KEY, content, request.request_id],
    )
    : await pool.query(
      `UPDATE academy_lesson_drafts SET content=$3, version=version+1, last_save_request_id=$4, updated_at=now()
        WHERE owner_id=$1 AND lesson_id=$2 AND version=$5 RETURNING version, updated_at`,
      [ownerId, LESSON_CHAT_STORAGE_KEY, content, request.request_id, request.expected_version],
    );
  if (saved.rowCount === 1) {
    const accepted = parseRow({ content, last_save_request_id: request.request_id, ...saved.rows[0] });
    if (!accepted) throw new Error('invalid_saved_progress');
    return projection(accepted);
  }
  // A competing writer may have committed this same request while we waited.
  // Re-read to adjudicate it, never retry or overwrite a competing decision.
  return replayOrConflict(await load(pool, ownerId), request);
}
