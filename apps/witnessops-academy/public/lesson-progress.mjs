import { LABELS } from './lesson-state.mjs';

const record = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, allowed) => Object.keys(x).every((key) => allowed.includes(key));
const text = (x, max) => typeof x === 'string' && x.length <= max;

/** Decode known lesson formats only. Unknown/MCP text must not be silently replaced. */
export function parseProgress(content) {
  let d;
  try { d = JSON.parse(content); } catch { return null; }
  if (!record(d) || !keys(d, ['schema', 'attempt', 'claims', 'limit', 'teacherReply', 'history'])) return null;
  if (d.schema !== undefined && d.schema !== 1) return null;
  if (!Array.isArray(d.claims) || d.claims.length !== 3 || !text(d.limit, 1500)) return null;
  if (!d.claims.every(c => record(c) && keys(c, ['label', 'reason'])
    && (c.label == null || LABELS.includes(c.label)) && (c.reason == null || text(c.reason, 500)))) return null;
  const attempt = d.attempt ?? 1;
  const teacherReply = d.teacherReply ?? '';
  const history = d.history ?? [];
  if (!Number.isSafeInteger(attempt) || attempt < 1 || !text(teacherReply, 10000) || !Array.isArray(history)) return null;
  if (!history.every(h => record(h) && keys(h, ['attempt', 'answer', 'reply'])
    && Number.isSafeInteger(h.attempt) && h.attempt > 0 && h.attempt < attempt
    && text(h.answer, 6000) && text(h.reply, 10000))) return null;
  return { schema: 1, attempt, claims: d.claims.map(c => ({ label: c.label ?? null, reason: c.reason ?? '' })), limit: d.limit, teacherReply, history };
}
