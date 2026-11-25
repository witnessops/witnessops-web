import { createHash, randomBytes, randomUUID } from 'node:crypto';

// Private, versioned exercise state. Both transports use this evaluator; neither
// browser arguments nor model prose can choose a scenario or award completion.
const SCHEMA = 'witnessops-lesson-chat/v1';
export const CHAT_LESSON_VERSION = '2026-11-25.1';
export const CHAT_COACHING_THRESHOLD = 12;
export const MAX_CHAT_DECISIONS = CHAT_COACHING_THRESHOLD + 1;
export const CHAT_LESSONS = Object.freeze([
  Object.freeze({ id: 'report-or-evidence', title: 'Report or evidence?', position: 1,
    objective: 'Accept only the backup and recovery claims supported by the records.' }),
  Object.freeze({ id: 'same-scope', title: 'Same record, wrong scope?', position: 2,
    objective: 'Match a check to the requested environment, revision and tenant before accepting it.' }),
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const lesson = id => CHAT_LESSONS.find(item => item.id === id);
const copy = value => structuredClone(value);
const error = (code, status = 400) => Object.assign(new Error(code), { code, status });
const hash = text => createHash('sha256').update(text).digest();
const pick = (seed, name, maximum) => hash(`${seed}:${name}`).readUInt32BE(0) % maximum;
const jsonEvidence = (name, value) => ({ name, language: 'json', content: JSON.stringify(value, null, 2) });
const say = (text, extra = {}) => ({ role: 'academy', text, ...extra });
const choice = (id, label) => ({ id, label });

function shuffled(choices, seed, stage) {
  return choices.map((item, i) => ({ item, i, order: hash(`${seed}:${stage}:${item.id}`).toString('hex') }))
    .sort((a, b) => a.order.localeCompare(b.order) || a.i - b.i).map(({ item }) => copy(item));
}

function backupScenario(seed) {
  const profile = pick(seed, 'backup-profile', 5);
  const expected = 1200 + pick(seed, 'files', 6000);
  const missing = profile === 2 ? 1 + pick(seed, 'missing', 9) : 0;
  const archived = expected - missing;
  const uploaded = profile !== 4;
  const verified = profile === 3;
  const service = ['billing', 'orders', 'research', 'support'][pick(seed, 'service', 4)];
  const job = `backup-${hash(`${seed}:job`).toString('hex').slice(0, 8)}`;
  const snapshot = `snapshot-${hash(`${seed}:snapshot`).toString('hex').slice(0, 8)}`;
  const hour = String(1 + pick(seed, 'hour', 19)).padStart(2, '0');
  const stamp = `2026-11-25T${hour}:05:00Z`;
  const manifest = {
    job_id: job, source: `${service}/production`, snapshot_id: snapshot,
    files: archived, expected_inventory_files: expected,
    matches_expected_inventory: missing === 0,
    archive_checksum_verified: true, upload_checksum_verified: uploaded,
    restore_test: verified ? `${job}-restore-1` : null,
  };
  const lines = [
    `${hour}:00 Backup started · ${job} · ${snapshot}`,
    `${hour}:04 Archive created · ${archived} files`,
    uploaded ? `${hour}:05 Upload completed` : `${hour}:05 Upload failed · destination unavailable`,
    `${hour}:05 Exit code: ${uploaded ? '0' : '1'}`,
  ];
  const evidence = [
    jsonEvidence('expected-inventory.json', {
      source: `${service}/production`, snapshot_id: snapshot, expected_files: expected,
      requirement: 'Recover every item in this snapshot and compare its content with this inventory.',
    }),
    { name: 'backup-job.log', language: 'text', content: lines.join('\n') },
    jsonEvidence('manifest.json', manifest),
  ];
  const scenario = { kind: 'backup', profile, expected, archived, missing, uploaded, verified, service, job, snapshot, stamp, evidence };
  if (verified) evidence.push(restoreEvidence(scenario));
  return scenario;
}

function restoreEvidence(scenario) {
  const success = scenario.profile === 0 || scenario.profile === 3;
  return jsonEvidence('restore-test.json', {
    test_id: `${scenario.job}-restore-1`, job_id: scenario.job,
    source: `${scenario.service}/production`, snapshot_id: scenario.snapshot,
    destination: 'isolated-exercise-restore', checked_at: scenario.stamp,
    expected_files: scenario.expected,
    restored_files: !scenario.uploaded ? 0 : scenario.profile === 1 ? scenario.archived - 1 : scenario.archived,
    matches_expected_inventory: success,
    all_file_checksums_match: success,
    result: success ? 'passed' : !scenario.uploaded ? 'not_run_no_uploaded_archive' : scenario.missing ? 'failed_missing_required_files' : 'failed_content_mismatch',
  });
}

function scopeScenario(seed) {
  const profile = pick(seed, 'scope-profile', 5);
  const release = 100 + pick(seed, 'release', 800);
  const tenant = `training-${hash(`${seed}:tenant`).toString('hex').slice(0, 6)}`;
  const request = {
    environment: 'production', revision: `release-${release}`, tenant,
    check: 'read-write-smoke', acceptance: 'Sign off this named check for this exact scope only.',
  };
  const record = {
    check_id: `check-${hash(`${seed}:check`).toString('hex').slice(0, 8)}`,
    environment: profile === 0 ? 'staging' : 'production',
    revision: `release-${profile === 1 ? release - 1 : release}`,
    tenant: profile === 2 ? `${tenant}-other` : tenant,
    check: request.check, result: profile === 4 ? 'failed' : 'passed',
    checked_at: '2026-11-25T08:05:00Z',
  };
  const followupPasses = profile !== 4 && (profile === 3 || pick(seed, 'followup-result', 2) === 0);
  return { kind: 'scope', profile, request, record, followupPasses, evidence: [
    jsonEvidence('requested-check.json', request), jsonEvidence('check-record.json', record),
  ] };
}

const scenarioFor = state => state.lesson_id === 'report-or-evidence' ? backupScenario(state.seed) : scopeScenario(state.seed);

function opening(scenario) {
  if (scenario.kind === 'backup') return say(
    `Your agent reports: “Backup completed successfully. All data is protected. Task closed.”\n\n` +
    `Inspect the records for the ${scenario.service} production snapshot. In this exercise, the supplied records are authentic; their coverage and meaning still need your judgment.`,
    { heading: 'It’s done. Prove it.', evidence: scenario.evidence },
  );
  return say(
    'Your agent reports: “The check passed. Production is ready.”\n\n' +
    'Compare the requested check with the supplied record. In this exercise, the records are authentic; a valid record can still describe the wrong environment, revision or tenant.',
    { heading: 'Same record. Same claim?', evidence: scenario.evidence },
  );
}

function backupChoices(stage) {
  if (stage === 'judgment') return [
    choice('accept_all', 'The backup is complete. All data is recoverable.'),
    choice('accept_limited', 'The archive was created and uploaded. Recovery remains unverified.'),
    choice('incomplete', 'An archive was uploaded, but required files are missing.'),
    choice('upload_failed', 'The archive exists, but upload failed; remote protection is not established.'),
    choice('verified_scope', 'Recovery was tested against this snapshot’s expected inventory; only that scope is supported.'),
    choice('nothing', 'There is insufficient evidence to establish anything.'),
  ];
  if (stage === 'verification') return [
    choice('confirm_report', 'Ask the agent to confirm its report.'),
    choice('controlled_restore', 'Run a controlled restore and compare recovered data against the expected inventory.'),
    choice('repeat_backup', 'Run another backup.'),
    choice('inspect_exit_code', 'Inspect the exit code again.'),
  ];
  if (stage === 'final') return [
    choice('accept_scope', 'Sign off recovery of this snapshot against its expected inventory; make no broader claim.'),
    choice('require_restore', 'Accept the supported backup findings but require a controlled restore before closure.'),
    choice('repair_inventory', 'Keep the task open: recover the missing required files and verify the complete inventory.'),
    choice('repair_upload', 'Keep the task open: fix the upload, then verify remote recovery.'),
    choice('repair_restore', 'Keep the task open: investigate the failed restore and verify a successful recovery.'),
    choice('close_on_confidence', 'Accept the agent’s confidence and close the task.'),
    choice('discard_all', 'Reject everything the records report.'),
  ];
  return [];
}

function scopeChoices(stage) {
  if (stage === 'judgment') return [
    choice('scope_mismatch', 'The record covers a different scope. The requested production check remains unverified.'),
    choice('production_supported', 'The requested production check passed; the record supports only that check.'),
    choice('check_failed', 'The record matches the requested scope and reports a failure.'),
    choice('accept_all', 'Everything in production is safe to release.'),
    choice('nothing', 'There is insufficient evidence to establish anything.'),
  ];
  if (stage === 'verification') return [
    choice('check_requested_scope', 'Run the named check against the requested production revision and tenant.'),
    choice('confirm_report', 'Ask the agent to confirm that production is ready.'),
    choice('repeat_same_check', 'Repeat the check against the same target recorded in the existing result.'),
    choice('inspect_exit_code', 'Read the existing result’s success or failure flag again.'),
  ];
  if (stage === 'final') return [
    choice('accept_scope', 'Sign off the successful requested check for its exact scope; release approval remains separate.'),
    choice('require_matching_check', 'Accept only the recorded result and require a check matching the requested production scope.'),
    choice('hold_failed', 'Record the matching check’s failure and keep the task open for remediation.'),
    choice('close_on_confidence', 'Accept the agent’s confidence and declare production ready.'),
    choice('discard_all', 'Reject every record as meaningless.'),
  ];
  return [];
}

function choicesFor(scenario, stage, seed, action, coached = false) {
  let choices = scenario.kind === 'backup' ? backupChoices(stage) : scopeChoices(stage);
  if (stage === 'final' && coached) {
    const boundary = scenario.kind === 'backup' ? backupBoundary(scenario, action) : scopeBoundary(scenario, action);
    choices = choices.filter(item => item.id === boundary.correct);
  }
  return shuffled(choices, seed, stage);
}

function initialBackupConclusion(scenario) {
  if (!scenario.uploaded) return 'upload_failed';
  if (scenario.missing) return 'incomplete';
  if (scenario.verified) return 'verified_scope';
  return 'accept_limited';
}

function backupBoundary(scenario, action) {
  if (!scenario.uploaded) return {
    correct: 'repair_upload', explanation: 'The archive was created, but the upload failed. A local archive does not establish a usable remote recovery copy.',
    record: [{ claim: 'Archive created', status: 'SUPPORTED' }, { claim: 'Upload completed', status: 'CONTRADICTED' }, { claim: 'Remote recovery', status: 'UNVERIFIED' }, { claim: 'Task closure', status: 'BLOCKED' }],
  };
  if (scenario.missing) return {
    correct: 'repair_inventory', explanation: `The archive contains ${scenario.archived} of ${scenario.expected} required files. An archive checksum or a restore of those included files cannot establish recovery of the missing items.`,
    record: [{ claim: 'Archive created and uploaded', status: 'SUPPORTED' }, { claim: 'Required inventory complete', status: 'CONTRADICTED' }, { claim: 'Complete recovery', status: 'UNVERIFIED' }, { claim: 'Task closure', status: 'BLOCKED' }],
  };
  if (scenario.verified || action === 'controlled_restore' && scenario.profile === 0) return {
    correct: 'accept_scope', explanation: 'The matching controlled restore recovered every item in the expected snapshot inventory and checked their contents. This supports that recovery claim, not future backups or all possible recovery conditions.',
    record: [{ claim: 'Archive created and uploaded', status: 'SUPPORTED' }, { claim: 'Expected snapshot inventory', status: 'MATCHED' }, { claim: 'Recovery of this snapshot', status: 'SUPPORTED' }, { claim: 'Task closure for this recovery check', status: 'SUPPORTED' }],
  };
  if (action === 'controlled_restore') return {
    correct: 'repair_restore', explanation: 'The controlled restore reported a content mismatch. Archive creation and upload remain supported; successful recovery is contradicted by the test result.',
    record: [{ claim: 'Archive created and uploaded', status: 'SUPPORTED' }, { claim: 'Successful recovery', status: 'CONTRADICTED' }, { claim: 'Task closure', status: 'BLOCKED' }],
  };
  return {
    correct: 'require_restore', explanation: 'Creation and upload are supported. No matching controlled restore has established recovery. Accept those limited findings and keep closure pending a restore against the expected inventory.',
    record: [{ claim: 'Archive created and uploaded', status: 'SUPPORTED' }, { claim: 'Recovery', status: 'UNVERIFIED' }, { claim: 'Task closure', status: 'BLOCKED' }],
  };
}

function scopeMatches(scenario, record) {
  return ['environment', 'revision', 'tenant', 'check'].every(key => scenario.request[key] === record[key]);
}

function scopedFollowup(scenario) {
  return {
    check_id: `${scenario.record.check_id}-requested`,
    environment: scenario.request.environment, revision: scenario.request.revision,
    tenant: scenario.request.tenant, check: scenario.request.check,
    result: scenario.followupPasses ? 'passed' : 'failed', checked_at: '2026-11-25T08:12:00Z',
  };
}

function scopeBoundary(scenario, action) {
  const record = action === 'check_requested_scope' ? scopedFollowup(scenario) : scenario.record;
  if (!scopeMatches(scenario, record)) {
    const mismatches = ['environment', 'revision', 'tenant', 'check'].filter(key => record[key] !== scenario.request[key]);
    return { correct: 'require_matching_check', explanation: `The ${mismatches.join(', ')} does not match the request. The result remains useful for its recorded scope; the requested production check is unverified.`,
      record: [{ claim: 'Result for recorded scope', status: 'SUPPORTED' }, { claim: 'Scope matches request', status: 'CONTRADICTED' }, { claim: 'Requested production check', status: 'UNVERIFIED' }, { claim: 'Task closure', status: 'BLOCKED' }] };
  }
  if (record.result !== 'passed') return { correct: 'hold_failed', explanation: 'This result matches the requested environment, revision, tenant and check, but it reports a failure. Matching scope makes the failure relevant; it does not make the check successful.',
    record: [{ claim: 'Scope matches request', status: 'SUPPORTED' }, { claim: 'Requested check passed', status: 'CONTRADICTED' }, { claim: 'Task closure', status: 'BLOCKED' }] };
  return { correct: 'accept_scope', explanation: 'The successful result matches the requested environment, revision, tenant and named check. You can sign off that check. It does not establish whole-system safety or authorize a release.',
    record: [{ claim: 'Scope matches request', status: 'SUPPORTED' }, { claim: 'Requested check passed', status: 'SUPPORTED' }, { claim: 'Closure of named check', status: 'SUPPORTED' }, { claim: 'Whole-system safety or release approval', status: 'NOT ESTABLISHED' }] };
}

function judgmentFeedback(scenario, selected) {
  if (scenario.kind === 'backup') {
    const correct = initialBackupConclusion(scenario);
    const prefix = selected === correct ? 'That judgment fits these records.' : selected === 'nothing'
      ? 'That is too restrictive. Doubt about the full claim does not erase the evidence that is present.'
      : 'That judgment goes beyond, or misses part of, the supplied evidence.';
    const boundary = backupBoundary(scenario);
    return say(`${prefix}\n\n${boundary.explanation}`, { heading: 'What the records support', record: boundary.record });
  }
  const matches = scopeMatches(scenario, scenario.record);
  const correct = !matches ? 'scope_mismatch' : scenario.record.result === 'passed' ? 'production_supported' : 'check_failed';
  const prefix = selected === correct ? 'That judgment keeps the claim within its evidence.' : selected === 'nothing'
    ? 'That is too restrictive. The record supports a result for its named scope, even when it cannot support the production claim.'
    : 'Compare the scope and the result separately before accepting the claim.';
  const boundary = scopeBoundary(scenario);
  return say(`${prefix}\n\n${boundary.explanation}`, { heading: 'Read the scope', record: boundary.record });
}

function verificationFeedback(scenario, selected) {
  if (selected === 'confirm_report') return say(
    'The agent replies: “Confirmed. I am confident in my report.”\n\nAdditional claims: 1. New technical evidence: 0. The status supported by the existing records has not changed.',
    { heading: 'Confirmation is another claim' },
  );
  if (scenario.kind === 'backup') {
    if (selected === 'controlled_restore') return say(
      'The simulated controlled restore compares the recovered snapshot with the expected inventory. Read its actual result before deciding whether it supports closure.',
      { heading: 'Restore result', evidence: [restoreEvidence(scenario)] },
    );
    if (selected === 'repeat_backup') return say(
      'The simulated repeat uses the same configuration and coverage. It reports the same archive and upload outcome. No restore was run. Repeating a backup does not resolve a recovery or missing-inventory question.',
      { heading: 'Another backup, same unanswered question' },
    );
    return say(`The log still ends with exit code ${scenario.uploaded ? '0' : '1'}. It describes that job’s result. Re-reading it does not test recovery.`, { heading: 'Same record, no new verification' });
  }
  if (selected === 'check_requested_scope') return say(
    'The simulated check now targets exactly the requested production revision and tenant. A matching scope can still produce a failing result.',
    { heading: 'Requested-scope result', evidence: [jsonEvidence('requested-scope-check.json', scopedFollowup(scenario))] },
  );
  if (selected === 'repeat_same_check') return say(
    'The simulated repeat uses the same target and reports the same result. It does not change which environment, revision or tenant was checked.',
    { heading: 'Repeated scope', evidence: [jsonEvidence('repeated-check.json', { ...scenario.record, check_id: `${scenario.record.check_id}-repeat`, checked_at: '2026-11-25T08:12:00Z' })] },
  );
  return say(`The result still says “${scenario.record.result}”. Reading that flag again cannot establish that the record matches the requested scope.`, { heading: 'Result and scope are different questions' });
}

function promptFor(scenario, stage, coached) {
  if (stage === 'judgment') return 'What are you willing to sign off on?';
  if (stage === 'verification') return scenario.kind === 'backup'
    ? 'Choose one verification action. What evidence would it add?'
    : 'Choose one verification action. Which scope will it establish?';
  if (stage === 'final') return coached
    ? 'Review the evidence with guidance. Choose the supported decision below to complete this coached practice.'
    : 'What is your final decision, based on the records now available?';
  if (coached) return 'Exercise completed with coaching. Review how the evidence supports your decision.';
  return 'Exercise completed. Your decision stays within the evidence.';
}

function coachingMessage() {
  return say('Read the supported boundary above, then choose the single supported decision below. Your earlier decisions stay in this conversation. Completing this step is coached practice, not an independent assessment or certification.',
    { heading: 'Review the evidence with guidance' });
}

function assertShape(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw error('invalid_attempt');
  const keys = ['schema', 'lesson_id', 'lesson_version', 'attempt_id', 'seed', 'decisions'];
  if (Object.keys(state).length !== keys.length || keys.some(key => !Object.hasOwn(state, key))) throw error('invalid_attempt');
  if (state.schema !== SCHEMA || state.lesson_version !== CHAT_LESSON_VERSION) throw error('unsupported_lesson_version', 409);
  if (!lesson(state.lesson_id)) throw error('unknown_lesson', 404);
  if (typeof state.attempt_id !== 'string' || !UUID.test(state.attempt_id) || typeof state.seed !== 'string' || !/^[a-f0-9]{64}$/.test(state.seed)) throw error('invalid_attempt');
  if (!Array.isArray(state.decisions) || state.decisions.length > MAX_CHAT_DECISIONS) throw error('invalid_attempt');
}

function reconstruct(state) {
  assertShape(state);
  const scenario = scenarioFor(state);
  const messages = [opening(scenario)];
  let stage = 'judgment';
  let action;
  let record;
  let coached = false;
  for (const [index, decision] of state.decisions.entries()) {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision) || Object.keys(decision).length !== 2 ||
      decision.stage !== stage || !Object.hasOwn(decision, 'choice_id')) throw error('invalid_attempt');
    const guidedDecision = stage === 'final' && index >= CHAT_COACHING_THRESHOLD;
    const selected = choicesFor(scenario, stage, state.seed, action, guidedDecision).find(item => item.id === decision.choice_id);
    if (!selected) throw error('invalid_attempt');
    if (guidedDecision) {
      coached = true;
      messages.push(coachingMessage());
    }
    messages.push({ role: 'learner', text: selected.label });
    if (stage === 'judgment') {
      messages.push(judgmentFeedback(scenario, selected.id));
      stage = 'verification';
    } else if (stage === 'verification') {
      action = selected.id;
      messages.push(verificationFeedback(scenario, selected.id));
      stage = 'final';
    } else if (stage === 'final') {
      const boundary = scenario.kind === 'backup' ? backupBoundary(scenario, action) : scopeBoundary(scenario, action);
      if (selected.id === boundary.correct) {
        record = boundary.record;
        const coachingNote = coached ? 'Completed with coaching: you reviewed the supported boundary and chose the guided decision.\n\n' : '';
        messages.push(say(`${coachingNote}${boundary.explanation}\n\nDone is a claim. Evidence sets the limit. Acceptance is your decision.\n\nSimulated exercise completed; no real infrastructure was tested and no certification was awarded.`,
          { heading: `Lesson ${lesson(state.lesson_id).position} completed${coached ? ' with coaching' : ''}`, record }));
        stage = 'complete';
      } else {
        const nextStep = index + 1 < CHAT_COACHING_THRESHOLD
          ? 'Make another decision using that boundary.'
          : 'Review the evidence with guidance before choosing the supported decision.';
        messages.push(say(`${selected.id === 'discard_all' ? 'Rejecting every record also discards supported findings.' : 'That decision is not supported by the available records.'}\n\n${boundary.explanation}\n\n${nextStep}`,
          { heading: 'Keep the decision inside the evidence', record: boundary.record }));
      }
    }
  }
  if (stage === 'final' && state.decisions.length === CHAT_COACHING_THRESHOLD) {
    coached = true;
    messages.push(coachingMessage());
  }
  return { scenario, messages, stage, record, action, coached };
}

export function validateAttempt(value) {
  try { reconstruct(value); return true; } catch { return false; }
}

export function createAttempt({ lessonId, seed, attemptId = randomUUID() } = {}) {
  if (!lesson(lessonId)) throw error('unknown_lesson', 404);
  if (typeof attemptId !== 'string' || !UUID.test(attemptId)) throw error('invalid_attempt_id');
  if (seed !== undefined && (typeof seed !== 'string' || seed.length < 1 || seed.length > 256)) throw error('invalid_seed');
  return {
    schema: SCHEMA, lesson_id: lessonId, lesson_version: CHAT_LESSON_VERSION,
    attempt_id: attemptId, seed: seed === undefined ? randomBytes(32).toString('hex') : hash(seed).toString('hex'),
    decisions: [],
  };
}

export function applyDecision(state, input) {
  const current = reconstruct(state);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 2 || !Object.hasOwn(input, 'stage') || !Object.hasOwn(input, 'choice_id')) throw error('invalid_decision');
  if (current.stage === 'complete') throw error('attempt_finished', 409);
  if (input.stage !== current.stage) throw error('stage_conflict', 409);
  if (!choicesFor(current.scenario, current.stage, state.seed, current.action, current.coached).some(item => item.id === input.choice_id)) throw error('unknown_choice');
  const next = copy(state);
  next.decisions.push({ stage: input.stage, choice_id: input.choice_id });
  return next;
}

export function presentAttempt(state, { version = 1, updatedAt = null } = {}) {
  const { scenario, messages, stage, record, action, coached } = reconstruct(state);
  if (!Number.isInteger(version) || version < 1 || version > 2147483647) throw error('invalid_version');
  const descriptor = lesson(state.lesson_id);
  const projection = {
    lesson_id: state.lesson_id, lesson_version: state.lesson_version, attempt_id: state.attempt_id,
    version, updated_at: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    title: descriptor.title, objective: descriptor.objective, simulated: true, stage, coached,
    status: stage === 'complete' ? 'completed' : 'in_progress',
    progress: { current: stage === 'judgment' ? 1 : stage === 'verification' ? 2 : 3, total: 3 },
    messages, prompt: promptFor(scenario, stage, coached), choices: choicesFor(scenario, stage, state.seed, action, coached),
  };
  if (record) projection.decision_record = record;
  if (stage === 'complete' && state.lesson_id === 'report-or-evidence') projection.next_lesson_id = 'same-scope';
  return copy(projection);
}
