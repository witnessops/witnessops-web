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

test('lesson 1 page fields keep the original copied text', () => {
  const fromPage = buildAnswer({
    title: 'Lesson 1 · Report or evidence?',
    attempt: 2,
    claims: [
      { text: 'The 02:00 backup run completed.', label: 'Only claimed', reason: 'A' },
      { text: 'All 3 databases saved.', label: 'Evidenced', reason: 'B' },
      { text: 'Restore tested.', label: 'Contradicted', reason: 'C' },
    ],
    limit: 'This does not show that a restore works.',
  });
  const legacy = buildAnswer({
    attempt: 2,
    claims: [
      { label: 'Only claimed', reason: 'A' },
      { label: 'Evidenced', reason: 'B' },
      { label: 'Contradicted', reason: 'C' },
    ],
    limit: 'This does not show that a restore works.',
  });
  assert.equal(fromPage, legacy);
});

test('a lesson title and claim text replace the lesson 1 defaults without grading', () => {
  const answer = buildAnswer({
    title: 'Lesson 2 · Same record, wrong scope?',
    attempt: 1,
    claims: [
      { text: 'The nightly price file was stored in production.', label: 'Evidenced', reason: 'A names production' },
      { text: 'All 4 regions loaded it.', label: 'Contradicted', reason: 'B lists 3 regions' },
      { text: 'Checkout was checked against it.', label: 'Only claimed', reason: 'C is staging' },
    ],
    limit: 'A staging pass does not show a production checkout.',
  });
  assert.match(answer, /^Lesson 2 · Same record, wrong scope\? · attempt 1/);
  assert.match(answer, /1\. The nightly price file was stored in production\.\nLabel: Evidenced/);
  assert.match(answer, /2\. All 4 regions loaded it\.\nLabel: Contradicted/);
  assert.match(answer, /3\. Checkout was checked against it\.\nLabel: Only claimed/);
  assert.match(answer, /Limit: A staging pass does not show a production checkout\.$/);
  assert.doesNotMatch(answer, /The 02:00 backup run completed/);
  assert.doesNotMatch(answer, /correct|incorrect|passed|score|GOOD|AGAIN/);
});

test('invalid labels stay unchosen when a lesson supplies its own claim text', () => {
  const answer = buildAnswer({
    title: 'Lesson 2 · Same record, wrong scope?',
    claims: [{ text: 'Checkout was checked against it.', label: 'Passed', reason: '  C\u0000 is staging  ' }],
  });
  assert.match(answer, /1\. Checkout was checked against it\.\nLabel: Not chosen\nArtifact and reason: C is staging/);
  assert.doesNotMatch(answer, /Label: Passed/);
  assert.doesNotMatch(answer, /\u0000/);
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
