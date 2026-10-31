import 'server-only';
import { constants, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import type { authenticatedWebSession } from '../auth';
import type { AppUser } from '../db/identity';
import { resolveIdentity } from '../db/identity';
import { database, transaction } from '../db/pool';
import { lockUnrevokedSession } from '../db/sessions';
import { requireWorkspaceMembership } from '../db/workspaces';
import { isAasrStagingBuild, stagingRuntimeReady, stagingDatabaseTargetDigest } from '../aasr-staging/config';
import { AASR_FIXTURE_WORKSPACE_ID } from './contract';
import { ApiError } from '../errors';
import { WORKSPACE_OWNER_ROLE, parseWorkspaceRole } from '../workspace-role-policy';
import { findDuplicateJsonObjectKey } from '../../../../witnessops-web/src/lib/json-ambiguity';

export type NativeFixtureSession = NonNullable<Awaited<ReturnType<typeof authenticatedWebSession>>>;
export type StagingAssignmentActor = { userId: string; subject: string; generation: number };
export type StagingAssignment = {
  schema: 'witnessops.aasr-staging-assignment.v1';
  reviewId: string;
  workspaceId: typeof AASR_FIXTURE_WORKSPACE_ID;
  origin: string;
  workosClientId: string;
  issuer: string;
  databaseTargetSha256: string;
  owner: StagingAssignmentActor;
  reviewer: StagingAssignmentActor;
};
export type AssignmentBinding = { origin: string; workosClientId: string; databaseTargetSha256: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REVIEWER_MEMBERSHIP_ROLE = parseWorkspaceRole('contributor');
const fail = (): never => { throw new Error('A reviewed staging assignment is required.'); };
function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === keys.sort().join());
}
function actor(value: unknown): StagingAssignmentActor {
  if (!exactKeys(value, ['userId', 'subject', 'generation']) || typeof value.userId !== 'string' || !uuid.test(value.userId)
    || typeof value.subject !== 'string' || !/^user_[A-Za-z0-9]{1,128}$/.test(value.subject)
    || !Number.isSafeInteger(value.generation) || Number(value.generation) < 1) return fail();
  return { userId: value.userId, subject: value.subject, generation: Number(value.generation) };
}
/** Strict operator input. Neither an email, a workspace role nor an HTTP field
 * can stand in for the reviewed native identity and membership generation. */
export function parseStagingAssignment(raw: string, binding: AssignmentBinding): StagingAssignment {
  if (Buffer.byteLength(raw) > 16384 || findDuplicateJsonObjectKey(raw) !== null) return fail();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail(); }
  if (!exactKeys(value, ['schema', 'reviewId', 'workspaceId', 'origin', 'workosClientId', 'issuer', 'databaseTargetSha256', 'owner', 'reviewer'])
    || value.schema !== 'witnessops.aasr-staging-assignment.v1' || value.workspaceId !== AASR_FIXTURE_WORKSPACE_ID
    || typeof value.reviewId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(value.reviewId)
    || typeof value.workosClientId !== 'string' || !/^client_[A-Za-z0-9_]{1,128}$/.test(value.workosClientId)
    || value.workosClientId !== binding.workosClientId || value.origin !== binding.origin
    || value.issuer !== `https://api.workos.com/user_management/${binding.workosClientId}`
    || typeof value.databaseTargetSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.databaseTargetSha256)
    || value.databaseTargetSha256 !== binding.databaseTargetSha256) return fail();
  const origin = new URL(binding.origin);
  if (origin.protocol !== 'https:' || origin.origin !== binding.origin || origin.hostname === 'app.witnessops.com') return fail();
  const owner = actor(value.owner), reviewer = actor(value.reviewer);
  if (owner.userId === reviewer.userId || owner.subject === reviewer.subject) return fail();
  return { schema: value.schema, reviewId: value.reviewId, workspaceId: AASR_FIXTURE_WORKSPACE_ID, origin: binding.origin,
    workosClientId: binding.workosClientId, issuer: String(value.issuer), databaseTargetSha256: binding.databaseTargetSha256, owner, reviewer };
}

/** No symlinks, group/other writers, unbounded reads, cached assignment or JSON
 * identity environment override. The operator mounts the reviewed file. */
export function readStagingAssignmentFile(path: string, binding: AssignmentBinding): StagingAssignment {
  if (!isAbsolute(path)) return fail();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 16384 || (stat.mode & 0o022) !== 0) return fail();
    const buffer = Buffer.alloc(16385);
    const bytes = readSync(fd, buffer, 0, buffer.length, 0);
    if (bytes > 16384) return fail();
    return parseStagingAssignment(buffer.subarray(0, bytes).toString('utf8'), binding);
  } finally { closeSync(fd); }
}
export function currentStagingAssignment(): StagingAssignment | null {
  try {
    if (!isAasrStagingBuild() || !stagingRuntimeReady()) return null;
    return readStagingAssignmentFile(process.env.WITNESSOPS_AASR_STAGING_ASSIGNMENT_FILE ?? '', {
      origin: new URL(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '').origin,
      workosClientId: process.env.WORKOS_CLIENT_ID ?? '',
      databaseTargetSha256: stagingDatabaseTargetDigest(process.env.DATABASE_URL ?? ''),
    });
  } catch { return null; }
}

/** Caller owns a transaction. Both mapping and membership remain locked until
 * its commit, and logout shares the session authorization lock. */
export async function requireStagingFixtureActor(client: PoolClient, user: AppUser, web: NativeFixtureSession, assignment: StagingAssignment | null): Promise<'owner' | 'reviewer'> {
  if (!assignment) throw new ApiError(403, 'Staging access is pending assignment.');
  const role = user.id === assignment.owner.userId ? WORKSPACE_OWNER_ROLE : user.id === assignment.reviewer.userId ? 'reviewer' : null;
  const expected = role === WORKSPACE_OWNER_ROLE ? assignment.owner : assignment.reviewer;
  if (!role || web.identity.provider !== 'workos' || web.identity.issuer !== assignment.issuer
    || web.identity.subject !== expected.subject || web.session.issuer !== assignment.issuer || web.session.subject !== expected.subject) {
    throw new ApiError(403, 'Staging access is pending assignment.');
  }
  await lockUnrevokedSession(client, web.session);
  // The complete assignment remains current, not just the requesting actor.
  // A revoked/changed counterpart cannot leave an apparently ready pairing.
  for (const [membershipRole, assigned] of [[WORKSPACE_OWNER_ROLE, assignment.owner], [REVIEWER_MEMBERSHIP_ROLE, assignment.reviewer]] as const) {
    const member = await requireWorkspaceMembership(client, assigned.userId === user.id ? user : { id: assigned.userId, displayName: null }, AASR_FIXTURE_WORKSPACE_ID);
    const mapping = await client.query(`SELECT 1 FROM identity_mappings WHERE user_id=$1 AND provider='workos' AND issuer=$2 AND subject=$3
      AND verified_email_snapshot IS NOT NULL AND length(verified_email_snapshot)>0 FOR SHARE`, [assigned.userId, assignment.issuer, assigned.subject]);
    if (!mapping.rowCount || member.generation !== assigned.generation || member.role !== membershipRole) {
      throw new ApiError(403, 'The staging assignment is not current.');
    }
  }
  return role;
}

/** Native login may persist the identity before membership assignment. A false
 * result grants nothing and exposes no manifest or other actor identifiers. */
export async function aasrFixtureAssignmentReady(web: NativeFixtureSession, suppliedPool?: Pool): Promise<boolean> {
  if (!isAasrStagingBuild() || !stagingRuntimeReady()) return false;
  try {
    const pool = suppliedPool ?? database();
    const user = await resolveIdentity(pool, web.identity);
    user.session = web.session;
    return await transaction(pool, async client => {
      await requireStagingFixtureActor(client, user, web, currentStagingAssignment());
      return true;
    });
  } catch { return false; }
}
