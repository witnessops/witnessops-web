import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { lessonPage, LESSON_ALIASES } from '../src/lesson-page.mjs';
import { LESSONS } from '../src/lesson-routes.mjs';
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

test('second lesson uses its own endpoint and retains its return path without inline styling', async () => {
  const { lessonById } = await import('../src/lesson-routes.mjs');
  const second = readFileSync(new URL('../../witnessops-academy/public/lessons/same-scope/index.html', import.meta.url), 'utf8');
  const page = lessonPage(second, { csrf_token: 'synthetic-token' }, lessonById('same-scope'));
  assert.match(page, /data-draft-api="\/academy\/api\/lessons\/same-scope\/draft"/);
  assert.match(page, /href="\/academy\/auth\/login\?lesson=same-scope"/);
  assert.match(page, /id="save-progress"/);
  assert.doesNotMatch(page, /style=|reloading or closing it clears them|only until this page closes/);
});

test('both hosted lessons explain saved work and provide help without assuming a teacher conversation', () => {
  for (const lesson of LESSONS) {
    const source = readFileSync(new URL(`../../witnessops-academy/public${lesson.publicPath}index.html`, import.meta.url), 'utf8');
    for (const session of [null, { csrf_token: 'synthetic-session-only' }]) {
      const page = lessonPage(source, session, lesson, 'https://community.example.invalid');
      assert.doesNotMatch(page, /existing conversation|then reads your attempt|Paste Docs's reply|reloading or closing it clears them|only until this page closes/);
      assert.match(page, /wait for the saved confirmation/);
      assert.match(page, /Unsaved edits are lost when you leave/);
      assert.match(page, /Saving work does not send it to support/);
      assert.match(page, /Saving your work does not request feedback/);
      assert.match(page, /choose any excerpt you want to share/);
      assert.match(page, /href="#lesson-support"/);
      assert.equal([...page.matchAll(/id="lesson-support"/g)].length, 1);
      assert.match(page, /href="https:\/\/witnessops\.com\/support#support-request" target="_blank" rel="noopener noreferrer"/);
      const mailto = new URL(page.match(/href="(mailto:[^"]+)"/)[1]);
      assert.equal(mailto.pathname, 'engage@mail.witnessops.com');
      assert.deepEqual([...mailto.searchParams], [['subject', 'Academy lesson question']]);
      assert.match(page, /id="teacher-reply" maxlength="10000"/);
      assert.match(page, /id="lesson-form" data-draft-api=/);
      assert.match(page, /No formal award is issued in this pilot/);
      assert.equal(page.includes('id="community-link"'), Boolean(session));
    }
  }
});

test('public onboarding separates invitation access, saved lessons and unsaved previews', () => {
  const home = readFileSync(new URL('../../witnessops-academy/public/index.html', import.meta.url), 'utf8');
  assert.match(home, /href="\/#support">Help/);
  assert.match(home, /id="support"/);
  assert.match(home, /Creating an account or signing in does not grant lesson access/);
  assert.match(home, /prepared lesson and workbook do not save your work/);
  assert.match(home, /Saving work does not send it to support/);
  assert.match(home, /href="https:\/\/witnessops\.com\/support#support-request" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(home, /There are no accounts|existing conversation|then reads your attempt/);
});
