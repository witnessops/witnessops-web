// Shared with the curriculum builder so the advertised byte cap cannot drift.
export const MAX_TEXT_BYTES = 32 * 1024;
export const MAX_BODY_BYTES = 256 * 1024;

export function answerTextError(text) {
  if (text.includes('\0')) return { error: 'invalid_text', status: 400 };
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAX_TEXT_BYTES) return { error: 'content_too_large', status: 413, max_bytes: MAX_TEXT_BYTES, bytes };
  return null;
}
