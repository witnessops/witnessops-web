import { createHash, randomUUID } from 'node:crypto';
import { CHAT_LESSONS, createAttempt, applyDecision, presentAttempt, validateAttempt } from './chat-engine.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMAT = 'academy-chat-record-v1';
const MAX_BYTES = 32768;
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keyFor = lessonId => {
  if (!CHAT_LESSONS.some(lesson => lesson.id === lessonId)) fail('unknown_lesson', 404);
  // This namespace is not accepted by the existing free-text draft routes/tools.
  return `chat-${lessonId}`;
};

export function validateChatRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_request');
  const fields = value.action === 'start' ? ['action', 'request_id']
    : value.action === 'submit' ? ['action', 'request_id', 'attempt_id', 'expected_version', 'stage', 'choice_id'] : [];
  if (!fields.length || fields.length !== Object.keys(value).length || Object.keys(value).some(key => !fields.includes(key))) fail('invalid_request');
  if (typeof value.request_id !== 'string' || !UUID.test(value.request_id)) fail('invalid_request_id');
  if (value.action === 'submit') {
    if (typeof value.attempt_id !== 'string' || !UUID.test(value.attempt_id) || !Number.isSafeInteger(value.expected_version) || value.expected_version < 1 || value.expected_version >= 2147483647) fail('invalid_request');
    if (!['judgment', 'verification', 'final'].includes(value.stage) || typeof value.choice_id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(value.choice_id)) fail('invalid_decision');
  }
  return value;
}

function readRecord(row, lessonId) {
  let record;
  try { record = JSON.parse(row.content); } catch { fail('saved_lesson_unavailable', 409); }
  if (record?.format !== FORMAT || Object.keys(record).length !== 3 || !validateAttempt(record.attempt) || !Array.isArray(record.requests) || record.requests.length > 13) fail('saved_lesson_unavailable', 409);
  if (record.attempt.decisions.length !== record.requests.length || row.version !== record.requests.length + 1) fail('saved_lesson_unavailable', 409);
  if (presentAttempt(record.attempt).lesson_id !== lessonId) fail('saved_lesson_unavailable', 409);
  if (record.requests.some((request, index) => !request || Object.keys(request).length !== 3 || typeof request.id !== 'string' || !UUID.test(request.id) || !/^[a-f0-9]{64}$/.test(request.digest ?? '') || request.version !== index + 1)) fail('saved_lesson_unavailable', 409);
  if (new Set(record.requests.map(request => request.id)).size !== record.requests.length) fail('saved_lesson_unavailable', 409);
  return record;
}

function serialize(record) {
  const content = JSON.stringify(record);
  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) fail('lesson_record_full', 413);
  return content;
}

/** The caller supplies only a validated session/token owner. No HTTP/tool argument selects it. */
export function createChatStore(db, { makeAttempt = createAttempt } = {}) {
  async function read(owner, lessonId) {
    const { rows } = await db.query(
      'SELECT content, version, updated_at FROM academy_lesson_drafts WHERE owner_id = $1 AND lesson_id = $2',
      [owner, keyFor(lessonId)],
    );
    return rows[0] ?? null;
  }
  function projection(row, lessonId, extra = {}) {
    const record = readRecord(row, lessonId);
    return { ...presentAttempt(record.attempt, { version: row.version, updatedAt: row.updated_at }), ...extra };
  }
  async function resume(owner, lessonId) {
    const row = await read(owner, lessonId);
    if (!row) fail('no_attempt', 404);
    return projection(row, lessonId);
  }
  async function start(owner, lessonId, request) {
    validateChatRequest(request);
    if (request.action !== 'start') fail('invalid_request');
    const key = keyFor(lessonId);
    const existing = await read(owner, lessonId);
    if (existing) return projection(existing, lessonId, { resumed: true });
    const content = serialize({ format: FORMAT, attempt: makeAttempt({ lessonId, attemptId: randomUUID() }), requests: [] });
    const inserted = await db.query(
      `INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, version, last_save_request_id)
       VALUES ($1,$2,$3,1,$4) ON CONFLICT (owner_id, lesson_id) DO NOTHING RETURNING content, version, updated_at`,
      [owner, key, content, request.request_id],
    );
    // A concurrent start on the other interface wins once; both return its saved assignment.
    const row = inserted.rows[0] ?? await read(owner, lessonId);
    if (!row) fail('lesson_unavailable', 503);
    return projection(row, lessonId, { resumed: inserted.rowCount !== 1 });
  }
  function replay(row, lessonId, request, fingerprint) {
    const record = readRecord(row, lessonId);
    const previous = record.requests.find(item => item.id === request.request_id);
    if (!previous) return null;
    if (previous.digest !== fingerprint || previous.version !== request.expected_version) fail('request_conflict', 409);
    return projection(row, lessonId, { replay: true });
  }
  async function submit(owner, lessonId, request) {
    validateChatRequest(request);
    if (request.action !== 'submit') fail('invalid_request');
    const key = keyFor(lessonId);
    const row = await read(owner, lessonId);
    if (!row) fail('no_attempt', 404);
    const fingerprint = digest([lessonId, request.attempt_id, request.expected_version, request.stage, request.choice_id]);
    const prior = replay(row, lessonId, request, fingerprint);
    if (prior) return prior;
    if (row.version !== request.expected_version) fail('version_conflict', 409);
    const record = readRecord(row, lessonId);
    if (presentAttempt(record.attempt).attempt_id !== request.attempt_id) fail('attempt_conflict', 409);
    const attempt = applyDecision(record.attempt, { stage: request.stage, choice_id: request.choice_id });
    const requests = [...record.requests, { id: request.request_id, digest: fingerprint, version: request.expected_version }];
    const content = serialize({ format: FORMAT, attempt, requests });
    const saved = await db.query(
      `UPDATE academy_lesson_drafts SET content=$3, version=version+1, last_save_request_id=$4, updated_at=now()
       WHERE owner_id=$1 AND lesson_id=$2 AND version=$5 RETURNING content, version, updated_at`,
      [owner, key, content, request.request_id, request.expected_version],
    );
    if (saved.rowCount === 1) return projection(saved.rows[0], lessonId);
    const current = await read(owner, lessonId);
    const repeated = current && replay(current, lessonId, request, fingerprint);
    if (repeated) return repeated;
    fail('version_conflict', 409);
  }
  async function progress(owner) {
    return { lessons: await Promise.all(CHAT_LESSONS.map(async lesson => {
      const row = await read(owner, lesson.id);
      if (!row) return { lesson_id: lesson.id, title: lesson.title, status: 'not_started' };
      const view = projection(row, lesson.id);
      return { lesson_id: view.lesson_id, title: view.title, status: view.status, progress: view.progress, version: view.version, updated_at: view.updated_at };
    })) };
  }
  return { resume, start, submit, progress };
}
