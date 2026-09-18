import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_CAPABILITIES, hasWorkspaceCapability } from './workspace-role-policy';
import { invitationEmail } from './invitation-email';
import { invitationReturn } from './invitation-return';

test('roles grant only the agreed collaboration capabilities; unsupported inputs deny', () => {
  const read = ['workspace:read', 'results:read', 'results:export', 'members:read'];
  const work = ['assets:create', 'hostname:run', 'linux:import', 'cli:authorize-server-check'];
  for (const capability of WORKSPACE_CAPABILITIES) {
    assert.equal(hasWorkspaceCapability('owner', capability), true);
    assert.equal(hasWorkspaceCapability('contributor', capability), [...read, ...work].includes(capability));
    assert.equal(hasWorkspaceCapability('viewer', capability), read.includes(capability));
  }
  for (const role of [null, '', 'Owner', 'admin', {}, '__proto__']) assert.equal(hasWorkspaceCapability(role, 'workspace:read'), false);
  for (const capability of ['billing:manage', 'share:create', '', null, {}, '__proto__']) assert.equal(hasWorkspaceCapability('owner', capability), false);
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
