import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CLAIMS } from '../../witnessops-academy/public/lesson-state.mjs';
import { buildCurriculum } from '../scripts/build-curriculum.mjs';
import { loadCurriculum } from '../src/curriculum.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURRICULUM_DIR = path.join(ROOT, 'curriculum');

test('curriculum JSON is byte-stable from the lesson source', () => {
  const first = buildCurriculum();
  const second = buildCurriculum();
  assert.deepEqual(second, first);
  assert.deepEqual(first.map((file) => file.name), ['report-or-evidence.json']);
  assert.equal(fs.existsSync(path.resolve(ROOT, '../witnessops-academy/public/lessons/reported-versus-saved/index.html')), true);
  assert.equal(first.some((file) => file.name === 'reported-versus-saved.json'), false);
  const committed = fs.readFileSync(path.join(CURRICULUM_DIR, first[0].name), 'utf8');
  assert.equal(first[0].text, committed);
  const lessons = loadCurriculum(CURRICULUM_DIR);
  const lesson = lessons.get('report-or-evidence');
  assert.equal(lesson.title, 'Report or evidence?');
  assert.equal(typeof lesson.exercise.artifacts['A · backup-job.log'], 'string');
  assert.deepEqual(lesson.exercise.claims, [...CLAIMS]);
  assert.equal(lesson.exercise.claims.length, 3);
});
