import fs from 'node:fs';
import path from 'node:path';

const LESSON_ID = /^[a-z0-9-]{1,64}$/;

export function loadCurriculum(dir) {
  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  const lessons = new Map();
  for (const name of names) {
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const stem = path.basename(name, '.json');
    if (typeof lesson.id !== 'string' || !LESSON_ID.test(lesson.id) || lesson.id !== stem) {
      throw new Error(`curriculum file ${name} has no matching lesson id`);
    }
    if (lessons.has(lesson.id)) throw new Error(`duplicate lesson ${lesson.id}`);
    if (!lesson.exercise || lesson.exercise.artifacts == null) {
      throw new Error(`curriculum lesson ${lesson.id} has no exercise artifacts`);
    }
    lessons.set(lesson.id, lesson);
  }
  if (lessons.size === 0) throw new Error(`curriculum directory is empty: ${dir}`);
  return lessons;
}
