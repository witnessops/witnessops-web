// Shared with the curriculum builder so the advertised byte cap cannot drift.
export const MAX_TEXT_BYTES = 32 * 1024;
export const MAX_BODY_BYTES = 256 * 1024;

export function hasLoneSurrogate(text) {
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

export function answerTextError(text) {
  if (typeof text !== 'string' || text.includes('\0') || hasLoneSurrogate(text)) {
    return { error: 'invalid_text', status: 400 };
  }
  if (text === '') return { error: 'empty_text', status: 400 };
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAX_TEXT_BYTES) return { error: 'content_too_large', status: 413, max_bytes: MAX_TEXT_BYTES, bytes };
  return null;
}
