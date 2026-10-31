import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseStagingAssignment, readStagingAssignmentFile } from './assignment';
import { AASR_FIXTURE_WORKSPACE_ID } from './contract';

const binding = { origin: 'https://staging.example.test', workosClientId: 'client_nativeTest', databaseTargetSha256: 'a'.repeat(64) };
const manifest = {
  schema: 'witnessops.aasr-staging-assignment.v1', reviewId: 'review-local-01', workspaceId: AASR_FIXTURE_WORKSPACE_ID,
  ...binding, issuer: `https://api.workos.com/user_management/${binding.workosClientId}`,
  owner: { userId: '22000000-0000-4000-8000-000000000011', subject: 'user_nativeOwner', generation: 3 },
  reviewer: { userId: '22000000-0000-4000-8000-000000000012', subject: 'user_nativeReviewer', generation: 2 },
};
test('assignment binds distinct native IDs, subjects, generations, issuer, origin and database', () => {
  assert.deepEqual(parseStagingAssignment(JSON.stringify(manifest), binding), manifest);
  for (const change of [
    { owner: { ...manifest.owner, generation: 0 } },
    { reviewer: { ...manifest.reviewer, userId: manifest.owner.userId } },
    { reviewer: { ...manifest.reviewer, subject: manifest.owner.subject } },
    { reviewer: { ...manifest.reviewer, role: 'owner' } },
    { issuer: 'https://fictional.example/issuer' }, { workosClientId: 'client_other' },
    { origin: 'https://app.witnessops.com' }, { databaseTargetSha256: 'b'.repeat(64) },
    { workspaceId: '11000000-0000-4000-8000-000000000009' }, { actor: 'reviewer' },
  ]) assert.throws(() => parseStagingAssignment(JSON.stringify({ ...manifest, ...change }), binding));
  assert.throws(() => parseStagingAssignment(JSON.stringify(manifest).replace('"reviewId":', '"reviewId":"duplicate","reviewId":'), binding));
  assert.throws(() => parseStagingAssignment(' '.repeat(16385), binding));
});
test('assignment file refuses relative paths, symlinks and group/world writers', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aasr-assignment-'));
  try {
    const path = join(directory, 'reviewed.json');
    writeFileSync(path, JSON.stringify(manifest), { mode: 0o600 });
    assert.deepEqual(readStagingAssignmentFile(path, binding), manifest);
    const link = join(directory, 'link.json');
    symlinkSync(path, link);
    assert.throws(() => readStagingAssignmentFile(link, binding));
    assert.throws(() => readStagingAssignmentFile('reviewed.json', binding));
    const writable = join(directory, 'writable.json');
    writeFileSync(writable, JSON.stringify(manifest), { mode: 0o666 });
    // Respect the caller's umask: a group/world-writable file is tested only
    // after explicitly making the task-owned temporary fixture writable.
    chmodSync(writable, 0o666);
    assert.throws(() => readStagingAssignmentFile(writable, binding));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
