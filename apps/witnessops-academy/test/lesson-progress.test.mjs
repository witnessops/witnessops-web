import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProgress } from '../public/lesson-progress.mjs';
const legacy = { claims: [{ label: 'Evidenced', reason: 'A' }, { label: null }, { label: 'Only claimed', reason: '' }], limit: '' };
test('partial legacy answers resume without requiring completed fields', () => {
  assert.deepEqual(parseProgress(JSON.stringify(legacy)), { schema: 1, attempt: 1, claims: [{ label: 'Evidenced', reason: 'A' }, { label: null, reason: '' }, { label: 'Only claimed', reason: '' }], limit: '', teacherReply: '', history: [] });
});
test('current lesson includes pasted feedback, earlier attempts and exact text', () => {
  const d = { ...legacy, schema: 1, attempt: 2, teacherReply: '<script>data only</script> ą', history: [{ attempt: 1, answer: 'Earlier answer', reply: 'Earlier reply' }] };
  assert.equal(parseProgress(JSON.stringify(d)).teacherReply, d.teacherReply);
  assert.deepEqual(parseProgress(JSON.stringify(d)).history, d.history);
});
test('unknown content and unsupported fields remain raw text rather than losing data', () => {
  for (const d of ['MCP answer', '', 'null', JSON.stringify({ ...legacy, owner_id: 'other' }), JSON.stringify({ ...legacy, schema: 2 }), JSON.stringify({ ...legacy, claims: [] }), JSON.stringify({ ...legacy, attempt: -1 }), JSON.stringify({ ...legacy, limit: 'x'.repeat(1501) }), JSON.stringify({ ...legacy, claims: [{ label: 'wrong' }, {}, {}] }), JSON.stringify({ ...legacy, history: [{ attempt: 2, answer: 'x', reply: 'x' }] })]) assert.equal(parseProgress(d), null);
});
