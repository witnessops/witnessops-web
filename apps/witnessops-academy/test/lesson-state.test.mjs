import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnswer } from '../public/lesson-state.mjs';

test('a new attempt contains no selected labels or invented learner reasons', () => {
  const answer = buildAnswer();
  assert.equal((answer.match(/Label: Not chosen/g) ?? []).length, 3);
  assert.equal((answer.match(/Artifact and reason: Not written/g) ?? []).length, 3);
  assert.match(answer, /Limit: Not written$/);
});

test('serializes the learner choices and retry number without grading them', () => {
  const answer = buildAnswer({
    attempt: 2,
    claims: [
      { label: 'Only claimed', reason: 'A: my own interpretation' },
      { label: 'Evidenced', reason: 'B: my own interpretation' },
      { label: 'Contradicted', reason: 'C: my own interpretation' },
    ],
    limit: 'This does not show that a restore works.',
  });
  assert.match(answer, /attempt 2/);
  assert.match(answer, /1\. The 02:00 backup run completed\.\nLabel: Only claimed/);
  assert.match(answer, /2\. All 3 databases saved\.\nLabel: Evidenced/);
  assert.match(answer, /3\. Restore tested\.\nLabel: Contradicted/);
  assert.doesNotMatch(answer, /correct|incorrect|passed|score|GOOD|AGAIN/);
});

test('untrusted pasted text stays plain text and invalid labels are not promoted', () => {
  const answer = buildAnswer({
    attempt: -1,
    claims: [{ label: 'Passed', reason: '<script>alert(1)</script>\u0000' }],
    limit: '  A matching hash is not a restore test.  ',
  });
  assert.match(answer, /attempt 1/);
  assert.match(answer, /Label: Not chosen/);
  assert.match(answer, /Artifact and reason: <script>alert\(1\)<\/script>/);
  assert.doesNotMatch(answer, /\u0000/);
  assert.match(answer, /Limit: A matching hash is not a restore test\.$/);
});
