/**
 * This is only the role-to-capability decision. Callers must separately prove
 * authenticated identity, active account/current workspace membership, current
 * role, resource/workspace binding, plan admission, and explicit collection or
 * CLI-scope authorization where required. Never authorize from a client role.
 * Sharing and billing deliberately have no capability in this slice.
 */
export const WORKSPACE_ROLES = Object.freeze(['owner', 'contributor', 'viewer'] as const);
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_CAPABILITIES = Object.freeze([
  'workspace:read',
  'results:read',
  'results:export',
  'members:read',
  'assets:create',
  'hostname:run',
  'linux:import',
  'cli:authorize-server-check',
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
  'cli:authorize-server-check',
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

/** Unknown roles and capabilities fail closed, including for Owners. */
export function hasWorkspaceCapability(role: unknown, capability: unknown): boolean {
  if (!isWorkspaceRole(role) || typeof capability !== 'string') return false;
  const allowed: readonly string[] = role === 'owner' ? ADMIN : role === 'contributor' ? WORK : READ;
  return allowed.includes(capability);
}
