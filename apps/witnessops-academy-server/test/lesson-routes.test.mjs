import assert from 'node:assert/strict';
import test from 'node:test';
import { LESSONS, lessonById, lessonByRoute, lessonByDraft, lessonByAlias } from '../src/lesson-routes.mjs';
test('both lessons resolve only their exact routes and keep independent draft keys', () => {
  assert.equal(LESSONS.length, 2);
  for (const lesson of LESSONS) {
    assert.equal(lessonById(lesson.id), lesson);
    assert.equal(lessonByRoute(lesson.route), lesson);
    assert.equal(lessonByDraft(lesson.draftPath), lesson);
    for (const path of lesson.aliases) assert.equal(lessonByAlias(path), lesson);
  }
  assert.notEqual(LESSONS[0].draftPath, LESSONS[1].draftPath);
  for (const path of ['/academy/learn/unknown', '/academy/api/lessons/unknown/draft',
    '/academy/api/lessons/same-scope/draft/other', '/academy/api/lessons/%2e%2e/draft',
    '/academy/api/lessons/Same-scope/draft', '/lessons/same-scope/other']) {
    assert.equal(lessonByRoute(path), undefined);
    assert.equal(lessonByDraft(path), undefined);
    assert.equal(lessonByAlias(path), undefined);
  }
});
