export const MAX_CONTENT_BYTES = 32 * 1024;
// JSON.stringify encodes one character as \u00XX, six bytes, in the worst case.
export const JSON_STRING_ESCAPE_MAX = 6;
export const MAX_BODY_BYTES = MAX_CONTENT_BYTES * JSON_STRING_ESCAPE_MAX + 1024;
export const PG_INT_MAX = 2147483647;
const DRAFT_FIELDS = new Set(['content', 'expected_version', 'save_request_id']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasLoneSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
      index += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) return true;
  }
  return false;
}

export function validateDraft(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'invalid_fields' };
  }
  const extra = Object.keys(body).filter((key) => !DRAFT_FIELDS.has(key));
  if (extra.length) return { ok: false, status: 400, error: 'unexpected_fields', fields: extra.slice(0, 20) };
  const content = body.content;
  const expectedVersion = body.expected_version;
  const saveRequestId = typeof body.save_request_id === 'string' && UUID_RE.test(body.save_request_id)
    ? body.save_request_id.toLowerCase()
    : null;
  if (
    typeof content !== 'string'
    || content === ''
    || content.includes('\0')
    || hasLoneSurrogate(content)
    || !Number.isSafeInteger(expectedVersion)
    || expectedVersion < 0
    || expectedVersion > PG_INT_MAX
    || saveRequestId === null
  ) return { ok: false, status: 400, error: 'invalid_fields' };
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
    return { ok: false, status: 413, error: 'content_too_large', max_bytes: MAX_CONTENT_BYTES };
  }
  return { ok: true, content, expectedVersion, saveRequestId };
}

export function worstCaseDraftJsonBytes(contentBytes = MAX_CONTENT_BYTES) {
  return Buffer.byteLength(JSON.stringify({
    content: '\u0001'.repeat(contentBytes),
    expected_version: PG_INT_MAX,
    save_request_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  }));
}

export function publicErrorCode(error) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  return /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : 'internal';
}
