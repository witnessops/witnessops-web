import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { lessonPage, LESSON_ALIASES } from '../src/lesson-page.mjs';
const html = readFileSync(new URL('../../witnessops-academy/public/lessons/report-or-evidence/index.html', import.meta.url), 'utf8');
test('authenticated page reuses the real lesson, with strict-CSP-compatible layout', () => {
  const page = lessonPage(html, { csrf_token: 'synthetic-token' });
  for (const text of ['Docs explains', 'Watch Docs do it', 'Your turn', 'backup-job.log', 'lesson-form', 'teacher-reply', 'Save work', 'data-academy-authenticated', 'synthetic-token']) assert.ok(page.includes(text), text);
  assert.doesNotMatch(page, /style=|reloading or closing it clears them|only until this page closes/);
  assert.match(page, /choose Save work/i);
});
test('signed-out page has sign-in and no session token', () => {
  const page = lessonPage(html, null);
  assert.match(page, /id="sign-in" href="\/academy\/auth\/login">Sign in/);
  assert.doesNotMatch(page, /id="academy-csrf"|data-academy-authenticated/);
});
test('csrf JSON is HTML escaped and all public lesson aliases select the same journey', () => {
  assert.doesNotMatch(lessonPage(html, { csrf_token: '</script><img>' }), /<\/script><img>/);
  for (const path of ['/lessons/report-or-evidence', '/lessons/report-or-evidence/', '/lessons/report-or-evidence/index.html']) assert.ok(LESSON_ALIASES.has(path));
});
