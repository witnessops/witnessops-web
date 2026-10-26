/**
 * This is only the role-to-capability decision. Callers must separately prove
 * authenticated identity, active account/current workspace membership, current
 * role, resource/workspace binding, plan admission, and explicit collection or
 * CLI-scope authorization where required. Never authorize from a client role.
 * Owner and Contributor may preview sharing (`shares:preview`). Publishing,
 * revoking and other share management stay Owner-only through `workspace:manage`.
 * Billing has no capability; its owner-only flag follows `workspace:manage`.
 */
export const WORKSPACE_ROLES = Object.freeze(['owner', 'contributor', 'viewer'] as const);
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Stored role created with a workspace and named by the last-owner predicate. */
export const WORKSPACE_OWNER_ROLE = 'owner' as const satisfies WorkspaceRole;

/** Invite control order. The set matches WORKSPACE_ROLES. */
export const WORKSPACE_ROLE_ASSIGNMENT_ORDER = Object.freeze(['viewer', 'contributor', 'owner'] as const satisfies readonly WorkspaceRole[]);

export const WORKSPACE_CAPABILITIES = Object.freeze([
  'workspace:read',
  'results:read',
  'results:export',
  'members:read',
  'assets:create',
  'hostname:run',
  'linux:import',
  'cli:authorize-server-check',
  'shares:preview',
  'invitations:manage',
  'members:manage',
  'workspace:manage',
] as const);
export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

const READ = Object.freeze([
  'workspace:read', 'results:read', 'results:export', 'members:read',
] as const satisfies readonly WorkspaceCapability[]);
const WORK = Object.freeze([
  ...READ, 'assets:create', 'hostname:run', 'linux:import',
  'cli:authorize-server-check', 'shares:preview',
] as const satisfies readonly WorkspaceCapability[]);
const ADMIN = Object.freeze([
  ...WORK, 'invitations:manage', 'members:manage', 'workspace:manage',
] as const satisfies readonly WorkspaceCapability[]);

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === 'owner' || value === 'contributor' || value === 'viewer';
}

/** Reject unsupported spellings instead of silently selecting or elevating a role. */
export function parseWorkspaceRole(value: unknown): WorkspaceRole {
  if (!isWorkspaceRole(value)) throw new Error('Choose Owner, Contributor or Viewer.');
  return value;
}

/** Display label. An unrecognized value stays on the least-privilege label. */
export function workspaceRoleLabel(role: unknown): 'Owner' | 'Contributor' | 'Viewer' {
  switch (role) {
    case 'owner': return 'Owner';
    case 'contributor': return 'Contributor';
    case 'viewer': return 'Viewer';
    default: return 'Viewer';
  }
}

function capabilitiesFor(role: WorkspaceRole): readonly WorkspaceCapability[] {
  switch (role) {
    case 'owner': return ADMIN;
    case 'contributor': return WORK;
    case 'viewer': return READ;
    default: {
      const unexpected: never = role;
      return unexpected;
    }
  }
}

/** Unknown roles and capabilities fail closed, including for Owners. */
export function hasWorkspaceCapability(role: unknown, capability: unknown): boolean {
  if (!isWorkspaceRole(role) || typeof capability !== 'string') return false;
  return capabilitiesFor(role).includes(capability as WorkspaceCapability);
}
