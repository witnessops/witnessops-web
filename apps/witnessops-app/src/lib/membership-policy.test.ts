import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { WORKSPACE_CAPABILITIES, WORKSPACE_OWNER_ROLE, WORKSPACE_ROLE_ASSIGNMENT_ORDER, WORKSPACE_ROLES, hasWorkspaceCapability, workspaceRoleLabel, type WorkspaceCapability, type WorkspaceRole } from './workspace-role-policy';
import { invitationEmail } from './invitation-email';
import { invitationReturn } from './invitation-return';

const MATRIX = {
  owner: {
    'workspace:read': true,
    'results:read': true,
    'results:export': true,
    'members:read': true,
    'assets:create': true,
    'hostname:run': true,
    'linux:import': true,
    'cli:authorize-server-check': true,
    'shares:preview': true,
    'invitations:manage': true,
    'members:manage': true,
    'workspace:manage': true,
  },
  contributor: {
    'workspace:read': true,
    'results:read': true,
    'results:export': true,
    'members:read': true,
    'assets:create': true,
    'hostname:run': true,
    'linux:import': true,
    'cli:authorize-server-check': true,
    'shares:preview': true,
    'invitations:manage': false,
    'members:manage': false,
    'workspace:manage': false,
  },
  viewer: {
    'workspace:read': true,
    'results:read': true,
    'results:export': true,
    'members:read': true,
    'assets:create': false,
    'hostname:run': false,
    'linux:import': false,
    'cli:authorize-server-check': false,
    'shares:preview': false,
    'invitations:manage': false,
    'members:manage': false,
    'workspace:manage': false,
  },
} as const satisfies Record<WorkspaceRole, Record<WorkspaceCapability, boolean>>;

test('every role and capability keeps the current allow or deny decision', () => {
  assert.deepEqual([...WORKSPACE_ROLES], ['owner', 'contributor', 'viewer']);
  assert.equal(WORKSPACE_CAPABILITIES.length, Object.keys(MATRIX.owner).length);
  for (const role of WORKSPACE_ROLES) {
    for (const capability of WORKSPACE_CAPABILITIES) {
      assert.equal(hasWorkspaceCapability(role, capability), MATRIX[role][capability], `${role} ${capability}`);
    }
  }
  for (const role of [null, '', 'Owner', 'admin', {}, '__proto__']) assert.equal(hasWorkspaceCapability(role, 'workspace:read'), false);
  for (const role of [null, '', 'Owner', 'admin', {}, '__proto__']) assert.equal(hasWorkspaceCapability(role, 'shares:preview'), false);
  for (const capability of ['billing:manage', 'share:create', 'shares:publish', 'shares:manage', '', null, {}, '__proto__']) assert.equal(hasWorkspaceCapability('owner', capability), false);
});

test('role labels keep the previous display, including an unrecognized value', () => {
  assert.equal(workspaceRoleLabel('owner'), 'Owner');
  assert.equal(workspaceRoleLabel('contributor'), 'Contributor');
  assert.equal(workspaceRoleLabel('viewer'), 'Viewer');
  for (const role of [null, '', 'Owner', 'admin']) assert.equal(workspaceRoleLabel(role), 'Viewer');
  assert.deepEqual([...WORKSPACE_ROLE_ASSIGNMENT_ORDER], ['viewer', 'contributor', 'owner']);
  assert.deepEqual([...WORKSPACE_ROLE_ASSIGNMENT_ORDER].sort(), [...WORKSPACE_ROLES].sort());
});

function productionSources(): { file: string; source: string }[] {
  const root = new URL('..', import.meta.url);
  const files: { file: string; source: string }[] = [];
  const walk = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) { walk(next); continue; }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.integration.ts')) continue;
      if (entry.name === 'workspace-role-policy.ts') continue;
      files.push({ file: path.relative(root.pathname, next.pathname), source: readFileSync(next, 'utf8') });
    }
  };
  walk(root);
  return files;
}

function splitRoles(list: string): string[] {
  return list.split(',').map(part => part.trim().replaceAll("'", ''));
}

test('production role decisions go through the policy, and SQL role lists stay pinned to it', () => {
  const decision = /[!=]==?\s*['"](?:owner|contributor|viewer)['"]|['"](?:owner|contributor|viewer)['"]\s*[!=]==?/;
  const sqlRole = /role\s*=\s*'(?:owner|contributor|viewer)'/;
  const booleanOwner = /requireWorkspaceMembership\([^)]*,\s*true\s*\)/;
  const sources = productionSources();
  assert.ok(sources.some(item => item.file.endsWith('db/shares.ts')));
  assert.ok(sources.some(item => item.file.endsWith('db/members.ts')));
  assert.ok(sources.some(item => item.file.endsWith('components/report-share.tsx')));
  const offenders: string[] = [];
  for (const { file, source } of sources) {
    source.split('\n').forEach((line, index) => {
      if (decision.test(line) || sqlRole.test(line) || booleanOwner.test(line)) offenders.push(`${file}:${index + 1}:${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
  const members = readFileSync(new URL('./db/members.ts', import.meta.url), 'utf8');
  assert.match(members, /m\.role=\$3/);
  assert.match(members, /\[workspace,userId,WORKSPACE_OWNER_ROLE\]/);
  const workspaces = readFileSync(new URL('./db/workspaces.ts', import.meta.url), 'utf8');
  assert.match(workspaces, /owner === true \? "workspace:manage" : owner/);
  assert.match(workspaces, /\[user\.id, id, WORKSPACE_OWNER_ROLE\]/);
  const shares = readFileSync(new URL('./db/shares.ts', import.meta.url), 'utf8');
  assert.match(shares, /An Owner or Contributor can preview sharing\./);
  assert.match(shares, /hasWorkspaceCapability\(m\.role, 'shares:preview'\)/);
  assert.match(shares, /hasWorkspaceCapability\(m\.role, 'workspace:manage'\)/);
  const admin = WORKSPACE_ROLES.filter(role => hasWorkspaceCapability(role, 'workspace:manage') && hasWorkspaceCapability(role, 'members:manage') && hasWorkspaceCapability(role, 'invitations:manage'));
  assert.deepEqual([...admin], [WORKSPACE_OWNER_ROLE]);
  const preview = WORKSPACE_ROLES.filter(role => hasWorkspaceCapability(role, 'shares:preview'));
  assert.deepEqual([...preview], ['owner', 'contributor']);
  const dir = new URL('../../db/migrations/', import.meta.url);
  let membership: string[] | undefined;
  let invitation: string[] | undefined;
  for (const file of readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) {
    const sql = readFileSync(new URL(file, dir), 'utf8');
    const membershipConstraint = sql.match(/ADD CONSTRAINT memberships_role_check CHECK \(role IN \(([^)]+)\)\)/);
    if (membershipConstraint) membership = splitRoles(membershipConstraint[1]);
    const invitationTable = sql.match(/CREATE TABLE workspace_invitations[\s\S]*?CHECK \(role IN \(([^)]+)\)\)/);
    if (invitationTable) invitation = splitRoles(invitationTable[1]);
  }
  assert.deepEqual(membership?.slice().sort(), [...WORKSPACE_ROLES].sort());
  assert.deepEqual(invitation?.slice().sort(), [...WORKSPACE_ROLES].sort());
});
test('invitation email preserves local identity and normalizes only the domain', () => {
  assert.equal(invitationEmail(' Test.Name+tag@EXAMPLE.COM '), 'Test.Name+tag@example.com');
  assert.notEqual(invitationEmail('Test@example.com'), invitationEmail('test@example.com'));
  assert.notEqual(invitationEmail('test+tag@example.com'), invitationEmail('test@example.com'));
  assert.equal(invitationEmail('test@bücher.example'), 'test@xn--bcher-kva.example');
  for (const input of [null, {}, 'a@b@c.com', '.a@example.com', 'a..b@example.com', 'a\r\nBcc:x@example.com', 'a@localhost', 'a@..example.com']) assert.throws(() => invitationEmail(input));
});
test('hosted return path accepts only an exact same-origin invitation locator', () => {
  const path = '/invitations/11111111-2222-3333-4444-555555555555';
  assert.equal(invitationReturn(path), path);
  for (const value of [null, 'https://evil.test'+path, '//evil.test'+path, path+'?next=https://evil.test', path+'#x', '/admin', '/invitations/../admin', path+'/']) assert.equal(invitationReturn(value), '/');
});
