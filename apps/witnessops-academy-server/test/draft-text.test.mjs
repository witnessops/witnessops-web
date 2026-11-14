import assert from 'node:assert/strict';
import test from 'node:test';
import { contentToSave, isBrowserDraft } from '../src/draft-text.mjs';

const form = JSON.stringify({
  claims: [
    { label: 'Evidenced', reason: 'A shows the time.' },
    { label: 'Contradicted', reason: 'B lists two.' },
    { label: 'Only claimed', reason: 'C is missing.' },
  ],
  limit: 'No proof of restore.',
});

test('free text is kept until the learner edits the form', () => {
  const saved = 'ą'.repeat(32);
  assert.equal(isBrowserDraft(saved), false);
  assert.equal(contentToSave(saved, form, false), saved);
  assert.equal(contentToSave(saved, form, true), form);
});

test('a browser-shaped draft is replaced by the form on save', () => {
  assert.equal(isBrowserDraft(form), true);
  assert.equal(contentToSave(form, '{"claims":[],"limit":""}', false), '{"claims":[],"limit":""}');
});
