import assert from 'node:assert/strict';
import test from 'node:test';
import { capturedActionLink } from './registration-smtp-capture.mjs';

// These strings are inert fixtures, never credentials or links from captured mail.
const origin = 'http://127.0.0.1:18080';
const realm = 'academy';
const action = origin + '/realms/academy/login-actions/action-token?key=synthetic-ci-link&client_id=academy-app';
const message = (headers, body) => headers + '\r\n\r\n' + body;
const parse = body => capturedActionLink(body, origin, realm);

test('registration mail parses a plain text action link', () => {
  assert.equal(parse(message('Content-Type: text/plain; charset=UTF-8', 'Verify your synthetic account:\r\n' + action)), action);
});

test('registration mail decodes quoted-printable soft wrapping and HTML entities', () => {
  const encoded = action.replaceAll('=', '=3D').replaceAll('&', '&amp;').replace('action-token', 'action-=\r\ntoken');
  const mail = message('Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable',
    '<a href=3D"' + encoded + '">Verify</a>');
  assert.equal(parse(mail), action);
});

test('registration mail decodes base64 text', () => {
  const encoded = Buffer.from('Reset your synthetic password:\r\n' + action).toString('base64');
  assert.equal(parse(message('Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64', encoded)), action);
});

test('registration mail accepts duplicate representations in bounded multipart alternatives', () => {
  const mail = message('MIME-Version: 1.0\r\nContent-Type: multipart/alternative;\r\n boundary="synthetic-boundary"', [
    'Synthetic MIME preamble',
    '--synthetic-boundary',
    message('Content-Type: text/plain; charset=UTF-8', action),
    '--synthetic-boundary',
    message('Content-Type: text/html; charset=UTF-8', '<a href="' + action.replaceAll('&', '&#38;') + '">Verify</a>'),
    '--synthetic-boundary--',
    'Synthetic MIME epilogue',
  ].join('\r\n'));
  assert.equal(parse(mail), action);
});

test('registration mail refuses links outside the exact local realm and endpoint', () => {
  for (const url of [
    action.replace(origin, 'https://mail.example.invalid'),
    action.replace('/realms/academy/', '/realms/master/'),
    action.replace('/login-actions/action-token', '/login-actions/another-action'),
    action.replace('http://', 'http://user:password@'),
    action + '#unexpected-fragment',
  ]) {
    assert.throws(() => parse(message('Content-Type: text/plain', url)), /ONE_PRIVATE_ACTION_LINK/);
  }
});

test('registration mail refuses ambiguous distinct verification links', () => {
  const second = action.replace('synthetic-ci-link', 'another-synthetic-ci-link');
  assert.throws(() => parse(message('Content-Type: text/plain', action + '\r\n' + second)), /ONE_PRIVATE_ACTION_LINK/);
});
