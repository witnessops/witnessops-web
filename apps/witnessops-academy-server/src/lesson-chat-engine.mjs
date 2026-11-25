// One deterministic practice definition for Academy and MCP. Fictional evidence
// and learner choices never authorize an infrastructure action or a formal award.
export const LESSON_CHAT_ID = 'report-or-evidence';
export const LESSON_CHAT_REVISION = 'backup-review-v1';
// A new revision uses the existing draft table without replacing worksheet work.
export const LESSON_CHAT_STORAGE_KEY = 'report-or-evidence-chat-v1';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const CHAT_LESSON = freeze({
  id: LESSON_CHAT_ID,
  revision: LESSON_CHAT_REVISION,
  title: 'Report or evidence?',
  subtitle: 'It’s done. Prove it.',
  simulated: true,
  total_steps: 3,
  evidence: [
    { id: 'backup-log', title: 'backup-job.log', content: '09:00 Backup started\n09:04 Archive created\n09:05 Upload completed\n09:05 Exit code: 0' },
    { id: 'manifest', title: 'manifest.json', content: '{\n  "files": 1842,\n  "checksum_verified": true,\n  "restore_test": null\n}' },
  ],
});

const STEPS = freeze({
  judgment: {
    number: 1,
    prompt: 'What do these records establish?',
    options: [
      { id: 'all_recoverable', label: 'The backup is complete and all data is recoverable.' },
      { id: 'created_recovery_unverified', label: 'The backup was created and uploaded; recovery is unverified.' },
      { id: 'backup_failed', label: 'The backup failed.' },
      { id: 'nothing_established', label: 'There is not enough evidence to establish anything.' },
    ],
  },
  verification: {
    number: 2,
    prompt: 'You can choose one additional verification action. Which one?',
    options: [
      { id: 'ask_agent', label: 'Ask the agent to confirm that everything is protected.' },
      { id: 'controlled_restore', label: 'Run a controlled restore and compare it with the expected inventory.' },
      { id: 'repeat_backup', label: 'Repeat the backup.' },
      { id: 'recheck_exit_code', label: 'Check the exit code again.' },
    ],
  },
  closure: {
    number: 3,
    prompt: 'What is your final judgment with the evidence currently available?',
    options: [
      { id: 'accept_and_close', label: 'Accept the confirmation and close the task.' },
      { id: 'reject_everything', label: 'Reject every finding.' },
      { id: 'accept_supported_require_restore', label: 'Accept the supported findings; require a controlled restore before closure.' },
    ],
  },
});

const JUDGMENT_FEEDBACK = freeze({
  all_recoverable: 'That conclusion goes beyond the records. A successful backup command does not establish that all required data can be recovered.',
  created_recovery_unverified: 'That is proportionate to the evidence. Keep the supported backup findings and leave recovery unverified.',
  backup_failed: 'The supplied records do not show a failed backup. A missing restore test is a gap, not evidence that the backup failed.',
  nothing_established: 'That rejects more than the evidence requires. The log supports archive creation and upload; the broader recovery claim remains unverified.',
});

const VERIFICATION_FEEDBACK = freeze({
  ask_agent: 'The simulated agent replies: “I confirm that the backup succeeded and all data is protected.” Additional claims: 1. New technical evidence: 0. Recovery tested: No. Recovery: UNVERIFIED.',
  controlled_restore: 'You selected the relevant check: restore in a controlled environment and compare the result with the expected inventory. Choosing it proposes the action; this simulation has not run it or supplied a restore result. Recovery remains UNVERIFIED.',
  repeat_backup: 'Another backup could create another archive, but it would not establish that either archive can be restored. This simulation has not run a second backup. Recovery remains UNVERIFIED.',
  recheck_exit_code: 'Exit code 0 is already in the log. Reading it again adds no evidence that the data can be restored. Recovery remains UNVERIFIED.',
});

const OUTCOME = freeze({
  creation: 'SUPPORTED',
  recovery: 'UNVERIFIED',
  closure: 'BLOCKED',
  next_action: 'Controlled restore against the expected inventory.',
});

export class LessonChatError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'LessonChatError';
    this.code = code;
    this.status = status;
  }
}

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => record(value)
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));

function replay(decisions) {
  if (!Array.isArray(decisions) || decisions.length > 5) throw new LessonChatError('invalid_progress');
  let stepId = 'judgment';
  const seenClosure = new Set();
  const messages = [
    { role: 'tutor', text: 'An agent says: “Backup completed successfully. All data is protected. Task closed.” Inspect the two fictional records before deciding what they support.' },
  ];
  for (const decision of decisions) {
    if (!exactKeys(decision, ['step_id', 'option_id'])
      || decision.step_id !== stepId
      || stepId === 'complete') throw new LessonChatError('invalid_progress');
    const option = STEPS[stepId].options.find(item => item.id === decision.option_id);
    if (!option || (stepId === 'closure' && seenClosure.has(option.id))) throw new LessonChatError('invalid_progress');
    messages.push({ role: 'learner', text: option.label });
    if (stepId === 'judgment') {
      messages.push({ role: 'tutor', text: JUDGMENT_FEEDBACK[option.id] });
      messages.push({ role: 'tutor', text: 'Archive creation and upload are supported by the log. The manifest reports a verified checksum; no independent checksum calculation is supplied. Whether all required data is included remains unverified. Recovery is unverified, and task closure is not established.' });
      stepId = 'verification';
    } else if (stepId === 'verification') {
      messages.push({ role: 'tutor', text: VERIFICATION_FEEDBACK[option.id] });
      stepId = 'closure';
    } else {
      seenClosure.add(option.id);
      if (option.id === 'accept_supported_require_restore') {
        messages.push({ role: 'tutor', text: 'Practice complete. Backup creation: SUPPORTED. Recovery: UNVERIFIED. Task closure: BLOCKED. Required next action: a controlled restore against the expected inventory.' });
        messages.push({ role: 'tutor', text: 'Confidence should be proportional to the evidence. Done is a claim. Proven is a condition. Accepted is a human decision. This fictional practice does not verify a real backup or award a qualification.' });
        stepId = 'complete';
      } else {
        messages.push({ role: 'tutor', text: option.id === 'accept_and_close'
          ? 'The recovery gap remains. Another assurance or a proposed check does not establish its result. Keep the task open and choose again.'
          : 'You can retain the supported creation and upload findings while requiring the missing recovery check. Rejecting everything is unnecessary. Choose again.' });
      }
    }
  }
  return { stepId, messages, seenClosure };
}

/** Reject malformed, reordered, repeated or fabricated saved decisions. */
export function parseLessonChatDecisions(value) {
  try {
    replay(value);
    return value.map(({ step_id, option_id }) => ({ step_id, option_id }));
  } catch {
    return null;
  }
}

/** All assessments are derived here; callers supply only previously validated choices. */
export function projectLessonChat(decisions = [], { version = 0, updated_at = null, saved = version > 0 } = {}) {
  const { stepId, messages, seenClosure } = replay(decisions);
  const completed = stepId === 'complete';
  const step = completed ? null : STEPS[stepId];
  return {
    lesson_id: CHAT_LESSON.id,
    revision: CHAT_LESSON.revision,
    title: CHAT_LESSON.title,
    subtitle: CHAT_LESSON.subtitle,
    simulated: true,
    version,
    updated_at,
    saved,
    step_id: stepId,
    step_number: completed ? 3 : step.number,
    total_steps: CHAT_LESSON.total_steps,
    completed,
    prompt: completed ? 'Practice complete.' : step.prompt,
    messages,
    evidence: CHAT_LESSON.evidence.map(item => ({ ...item })),
    options: completed ? [] : step.options.filter(item => !seenClosure.has(item.id)).map(item => ({ ...item })),
    outcome: completed ? { ...OUTCOME } : null,
  };
}

export function advanceLessonChat(decisions, decision) {
  const state = replay(decisions);
  if (!exactKeys(decision, ['step_id', 'option_id'])) throw new LessonChatError('invalid_decision');
  if (state.stepId === 'complete') throw new LessonChatError('lesson_complete', 409);
  if (decision.step_id !== state.stepId) throw new LessonChatError('step_conflict', 409);
  if (!STEPS[state.stepId].options.some(item => item.id === decision.option_id)) throw new LessonChatError('invalid_option');
  if (state.stepId === 'closure' && state.seenClosure.has(decision.option_id)) throw new LessonChatError('decision_already_submitted', 409);
  return [...decisions.map(item => ({ ...item })), { step_id: decision.step_id, option_id: decision.option_id }];
}
