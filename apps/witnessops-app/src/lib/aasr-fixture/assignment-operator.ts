import 'server-only';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { membershipLock } from '../db/membership-lock';
import type { StagingAssignment } from './assignment';
import { findDuplicateJsonObjectKey } from '../../../../witnessops-web/src/lib/json-ambiguity';
import { WORKSPACE_OWNER_ROLE, parseWorkspaceRole, type WorkspaceRole } from '../workspace-role-policy';

const WORKSPACE_NAME = 'SYN-NORTHSTAR AASR staging';
const WORKSPACE_SLUG = 'aasr-staging-synthetic';
const CREATION_KEY = '11000000-0000-4000-8000-000000000002';
type Workspace = { id: string; name: string; slug: string; status: 'active' | 'archived'; created_by: string; creation_key: string };
type Membership = { user_id: string; role: WorkspaceRole; generation: number; status: 'active' | 'revoked' };
export type AssignmentSnapshot = { workspace: Workspace | null; memberships: Membership[] };
export type AssignmentPlan = {
  schema: 'witnessops.aasr-staging-assignment-plan.v1'; assignmentSha256: string;
  before: AssignmentSnapshot; after: AssignmentSnapshot;
};
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const assignmentDigest = (assignment: StagingAssignment) => createHash('sha256').update(JSON.stringify(assignment)).digest('hex');
function desired(assignment: StagingAssignment): AssignmentSnapshot {
  return {
    workspace: { id: assignment.workspaceId, name: WORKSPACE_NAME, slug: WORKSPACE_SLUG, status: 'active', created_by: assignment.owner.userId, creation_key: CREATION_KEY },
    memberships: [
      { user_id: assignment.owner.userId, role: WORKSPACE_OWNER_ROLE, generation: assignment.owner.generation, status: 'active' as const },
      { user_id: assignment.reviewer.userId, role: parseWorkspaceRole('contributor'), generation: assignment.reviewer.generation, status: 'active' as const },
    ].sort((a, b) => a.user_id.localeCompare(b.user_id)),
  };
}
function allowedBefore(before: AssignmentSnapshot, after: AssignmentSnapshot) {
  return before && Object.keys(before).sort().join() === 'memberships,workspace'
    && (before.workspace === null || equal(before.workspace, after.workspace))
    && Array.isArray(before.memberships)
    && before.memberships.length <= 2
    && before.memberships.every((m, i) => equal(m, after.memberships.find(a => a.user_id === m.user_id)) && (i === 0 || before.memberships[i - 1].user_id < m.user_id))
    && (before.workspace !== null || before.memberships.length === 0);
}
/** Receipt data is never trusted to select a workspace, identity, role or SQL. */
export function parseAssignmentPlan(raw: string, assignment: StagingAssignment): AssignmentPlan {
  if (Buffer.byteLength(raw) > 32768 || findDuplicateJsonObjectKey(raw) !== null) throw new Error('Invalid reviewed assignment plan.');
  const plan = JSON.parse(raw) as AssignmentPlan;
  const after = desired(assignment);
  if (!plan || Object.keys(plan).sort().join() !== 'after,assignmentSha256,before,schema'
    || plan.schema !== 'witnessops.aasr-staging-assignment-plan.v1' || plan.assignmentSha256 !== assignmentDigest(assignment)
    || !equal(plan.after, after) || !allowedBefore(plan.before, after)) throw new Error('Invalid reviewed assignment plan.');
  for (const member of after.memberships) {
    if (!plan.before.memberships.some(m => m.user_id === member.user_id) && member.generation !== 1) throw new Error('New memberships require reviewed generation 1.');
  }
  return plan;
}
/** The runtime connection is a login role, never an owner or a role able to
 * inherit/SET ROLE into an owner or privileged role. PostgreSQL's implicit
 * pg_database_owner/public-schema relationship is covered by database owner
 * membership, in addition to explicit schema and relation ownership. */
export async function verifyStagingDatabaseRoles(client: PoolClient, runtimeRole: string, expectedDatabase: string, migrationRole: string): Promise<void> {
  const actual = (await client.query<{ database: string; username: string }>('SELECT current_database() AS database,current_user AS username')).rows[0];
  if (actual.database !== expectedDatabase || actual.username !== migrationRole || runtimeRole === migrationRole) throw new Error('Connected database identity differs from the reviewed target.');
  const role = (await client.query<{ safe: boolean }>(`SELECT r.rolcanlogin
    AND NOT EXISTS(SELECT 1 FROM pg_roles privileged WHERE (privileged.rolsuper OR privileged.rolcreatedb OR privileged.rolcreaterole OR privileged.rolbypassrls) AND pg_has_role(r.oid,privileged.oid,'MEMBER'))
    AND NOT EXISTS(SELECT 1 FROM pg_database d WHERE d.datname=current_database() AND pg_has_role(r.oid,d.datdba,'MEMBER'))
    AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname=current_schema() AND pg_has_role(r.oid,n.nspowner,'MEMBER'))
    AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND pg_has_role(r.oid,c.relowner,'MEMBER'))
    AND NOT has_database_privilege(r.oid,current_database(),'CREATE')
    AND NOT has_schema_privilege(r.oid,current_schema(),'CREATE') AS safe
    FROM pg_roles r WHERE r.rolname=$1`, [runtimeRole])).rows[0];
  if (!role?.safe) throw new Error('The bound runtime login role must have no ownership, owner-role membership or administrative/create privileges.');
}
async function snapshot(client: PoolClient, assignment: StagingAssignment): Promise<AssignmentSnapshot> {
  await membershipLock(client, assignment.workspaceId, true);
  const workspace = (await client.query<Workspace>('SELECT id,name,slug,status,created_by,creation_key FROM workspaces WHERE id=$1 FOR UPDATE', [assignment.workspaceId])).rows[0] ?? null;
  const memberships = (await client.query<Membership>('SELECT user_id,role,generation,status FROM memberships WHERE workspace_id=$1 ORDER BY user_id FOR UPDATE', [assignment.workspaceId])).rows;
  return { workspace, memberships };
}
async function requireNativeIdentities(client: PoolClient, assignment: StagingAssignment) {
  // Identities must already exist after native sign-in. This utility never
  // inserts users/mappings or enrolls an email/name/domain as an identity.
  for (const actor of [assignment.owner, assignment.reviewer].sort((a, b) => a.userId.localeCompare(b.userId))) {
    const row = (await client.query<{ status: string; early_access_state: string | null; early_access_activated_at: Date | null }>(
      'SELECT status,early_access_state,early_access_activated_at FROM users WHERE id=$1 FOR UPDATE', [actor.userId])).rows[0];
    if (!row || row.status !== 'active' || row.early_access_state === 'paused' || (row.early_access_state === null && row.early_access_activated_at)) throw new Error('Both reviewed native accounts must be active.');
    const identity = await client.query(`SELECT 1 FROM identity_mappings WHERE user_id=$1 AND provider='workos' AND issuer=$2 AND subject=$3
      AND verified_email_snapshot IS NOT NULL AND length(verified_email_snapshot)>0 FOR SHARE`, [actor.userId, assignment.issuer, actor.subject]);
    if (identity.rowCount !== 1) throw new Error('Reviewed native WorkOS identity mapping was not found. Complete native sign-in first.');
  }
}
/** Caller owns BEGIN and must ROLLBACK a dry run. Locks serialize with native
 * membership mutation; no INSERT/UPDATE/DELETE occurs in this function. */
export async function inspectAssignment(client: PoolClient, assignment: StagingAssignment): Promise<AssignmentPlan> {
  const before = await snapshot(client, assignment);
  await requireNativeIdentities(client, assignment);
  const after = desired(assignment);
  if (!allowedBefore(before, after)) throw new Error('Synthetic workspace or memberships differ from the reviewed assignment. No changes made.');
  const occupied = await client.query(`SELECT EXISTS(SELECT 1 FROM assets WHERE workspace_id=$1)
    OR EXISTS(SELECT 1 FROM runs WHERE workspace_id=$1)
    OR EXISTS(SELECT 1 FROM workspace_invitations WHERE workspace_id=$1) AS occupied`, [assignment.workspaceId]);
  if (occupied.rows[0]?.occupied) throw new Error('The staging fixture workspace must contain no product assets, runs or invitations.');
  return parseAssignmentPlan(JSON.stringify({ schema: 'witnessops.aasr-staging-assignment-plan.v1', assignmentSha256: assignmentDigest(assignment), before, after }), assignment);
}
export async function applyAssignment(client: PoolClient, assignment: StagingAssignment, reviewed: AssignmentPlan): Promise<{ alreadyApplied: boolean }> {
  const plan = parseAssignmentPlan(JSON.stringify(reviewed), assignment);
  const current = await inspectAssignment(client, assignment);
  if (equal(current.before, plan.after)) return { alreadyApplied: true };
  if (!equal(current.before, plan.before)) throw new Error('Assignment changed since the reviewed dry run. No changes made.');
  if (!plan.before.workspace) await client.query('INSERT INTO workspaces(id,name,slug,created_by,creation_key) VALUES ($1,$2,$3,$4,$5)',
    [assignment.workspaceId, WORKSPACE_NAME, WORKSPACE_SLUG, assignment.owner.userId, CREATION_KEY]);
  for (const member of plan.after.memberships) {
    if (!plan.before.memberships.some(m => m.user_id === member.user_id)) await client.query('INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,$3)', [member.user_id, assignment.workspaceId, member.role]);
  }
  if (!equal(await snapshot(client, assignment), plan.after)) throw new Error('Assignment readback did not match the reviewed plan.');
  return { alreadyApplied: false };
}
export async function rollbackAssignment(client: PoolClient, assignment: StagingAssignment, reviewed: AssignmentPlan): Promise<{ alreadyRolledBack: boolean }> {
  const plan = parseAssignmentPlan(JSON.stringify(reviewed), assignment);
  const current = await snapshot(client, assignment);
  const rolledBack = structuredClone(plan.after);
  if (!plan.before.workspace && rolledBack.workspace) rolledBack.workspace.status = 'archived';
  for (const member of rolledBack.memberships) if (!plan.before.memberships.some(m => m.user_id === member.user_id)) { member.status = 'revoked'; member.generation++; }
  if (equal(current, rolledBack) || equal(current, plan.before)) return { alreadyRolledBack: true };
  if (!equal(current, plan.after)) throw new Error('Assignment drift blocks rollback. No changes made.');
  for (const member of plan.after.memberships) {
    if (!plan.before.memberships.some(m => m.user_id === member.user_id)) await client.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE workspace_id=$1 AND user_id=$2", [assignment.workspaceId, member.user_id]);
  }
  if (!plan.before.workspace) await client.query("UPDATE workspaces SET status='archived',updated_at=now() WHERE id=$1", [assignment.workspaceId]);
  if (!equal(await snapshot(client, assignment), rolledBack)) throw new Error('Rollback readback mismatch.');
  return { alreadyRolledBack: false };
}
