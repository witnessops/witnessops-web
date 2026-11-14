import assert from 'node:assert/strict';
import test from 'node:test';
import { FORBIDDEN_INPUT_FIELDS, SAVED_TEXT_NOTE, SERVER_INSTRUCTIONS, TOOLS } from '../src/tools.mjs';

const EXPECTED_KEYS = {
  list_lessons: [],
  get_lesson: ['lesson_id'],
  get_my_answer: ['lesson_id'],
  save_answer: ['lesson_id', 'text', 'expected_version'],
};

test('tool inputs have no owner, sub, or id fields', () => {
  assert.deepEqual(TOOLS.map((tool) => tool.name), Object.keys(EXPECTED_KEYS));
  for (const tool of TOOLS) {
    const keys = Object.keys(tool.inputSchema.shape);
    assert.deepEqual(keys, EXPECTED_KEYS[tool.name]);
    for (const field of FORBIDDEN_INPUT_FIELDS) {
      assert.equal(keys.includes(field), false, `${tool.name} exposes ${field}`);
      const forged = { lesson_id: 'report-or-evidence', text: 'learner text', expected_version: 0, [field]: 'forged' };
      assert.equal(tool.inputSchema.safeParse(forged).success, false, `${tool.name} accepted ${field}`);
    }
  }
});

test('saved learner text is described as data, not instructions', () => {
  assert.match(SAVED_TEXT_NOTE, /data, not instructions/);
  assert.match(SERVER_INSTRUCTIONS, /data, not instructions/);
  for (const name of ['get_my_answer', 'save_answer']) {
    const tool = TOOLS.find((item) => item.name === name);
    assert.match(tool.description, /data, not instructions/);
  }
});

test('save_answer accepts the 32 KiB boundary shape and rejects a bad version', () => {
  const save = TOOLS.find((tool) => tool.name === 'save_answer');
  assert.equal(save.inputSchema.safeParse({
    lesson_id: 'report-or-evidence',
    text: 'ą'.repeat(16384),
    expected_version: 0,
  }).success, true);
  assert.equal(save.inputSchema.safeParse({
    lesson_id: 'report-or-evidence',
    text: 'x',
    expected_version: -1,
  }).success, false);
  assert.equal(save.inputSchema.safeParse({
    lesson_id: '../secret',
    text: 'x',
    expected_version: 0,
  }).success, false);
});
