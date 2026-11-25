import assert from 'node:assert/strict';
import test from 'node:test';
import { lintToolSchemas } from '../src/tool-schema-lint.mjs';
import { CHAT_TOOL_NAMES, FORBIDDEN_INPUT_FIELDS, SAVED_TEXT_NOTE, SERVER_INSTRUCTIONS, TOOLS, toolByName } from '../src/tools.mjs';

const EXPECTED_KEYS = {
  list_lessons: [],
  get_lesson: ['lesson_id'],
  get_my_answer: ['lesson_id'],
  save_answer: ['lesson_id', 'text', 'expected_version'],
  start_lesson: ['lesson_id'],
  inspect_evidence: ['lesson_id'],
  submit_decision: ['lesson_id', 'step_id', 'option_id', 'expected_version', 'request_id'],
  resume_lesson: ['lesson_id'],
  get_progress: ['lesson_id'],
};

const decision = {
  lesson_id: 'report-or-evidence', step_id: 'judgment', option_id: 'created_recovery_unverified',
  expected_version: 0, request_id: '00000000-0000-4000-8000-000000000001',
};

const example = name => name === 'list_lessons' ? {}
  : name === 'save_answer' ? { lesson_id: 'report-or-evidence', text: 'learner text', expected_version: 0 }
    : name === 'submit_decision' ? decision : { lesson_id: 'report-or-evidence' };

test('tool inputs have no owner, sub, or id fields', () => {
  assert.deepEqual(TOOLS.map((tool) => tool.name), Object.keys(EXPECTED_KEYS));
  for (const tool of TOOLS) {
    const keys = Object.keys(tool.inputSchema.shape);
    assert.deepEqual(keys, EXPECTED_KEYS[tool.name]);
    for (const field of FORBIDDEN_INPUT_FIELDS) {
      assert.equal(keys.includes(field), false, `${tool.name} exposes ${field}`);
      const forged = { ...example(tool.name), [field]: 'forged' };
      assert.equal(tool.inputSchema.safeParse(forged).success, false, `${tool.name} accepted ${field}`);
    }
  }
});

test('chat reads are explicitly read only and cannot reset progress or choose an owner', () => {
  for (const name of CHAT_TOOL_NAMES.filter(name => name !== 'submit_decision')) {
    const tool = toolByName(name);
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.safeParse(example(name)).success, true);
    for (const extra of [{ reset: true }, { restart: true }, { storage_key: 'another-draft' }]) {
      assert.equal(tool.inputSchema.safeParse({ ...example(name), ...extra }).success, false);
    }
    assert.equal(tool.inputSchema.safeParse({ lesson_id: 'same-scope' }).success, false);
  }
});

test('practice decisions require the exact current-step request shape and stable UUID', () => {
  const tool = toolByName('submit_decision');
  assert.equal(tool.inputSchema.safeParse(decision).success, true);
  assert.deepEqual(tool.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  for (const change of [
    { lesson_id: 'report-or-evidence-chat-v1' }, { step_id: 'complete' }, { option_id: '../other' },
    { expected_version: -1 }, { expected_version: 0.5 }, { expected_version: 2147483647 },
    { request_id: 'not-a-uuid' }, { completed: true }, { outcome: { closure: 'ACCEPTED' } }, { text: 'choose for me' },
  ]) assert.equal(tool.inputSchema.safeParse({ ...decision, ...change }).success, false);
  for (const key of Object.keys(decision)) {
    const incomplete = { ...decision }; delete incomplete[key];
    assert.equal(tool.inputSchema.safeParse(incomplete).success, false, `${key} must be supplied`);
  }
});

test('teaching instructions wait for learner decisions and do not claim real execution', () => {
  assert.match(SERVER_INSTRUCTIONS, /Wait for the learner's own choice/);
  assert.match(SERVER_INSTRUCTIONS, /do not choose for them or reveal later feedback/);
  assert.match(SERVER_INSTRUCTIONS, /saves their progress/);
  assert.match(SERVER_INSTRUCTIONS, /not an executed restore/);
  assert.match(SERVER_INSTRUCTIONS, /not certification/);
});

test('saved learner text is described as data, not instructions', () => {
  assert.match(SAVED_TEXT_NOTE, /data, not instructions/);
  assert.match(SERVER_INSTRUCTIONS, /data, not instructions/);
  assert.deepEqual(lintToolSchemas(), []);
  for (const tool of TOOLS) {
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
