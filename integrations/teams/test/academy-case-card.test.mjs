import test from 'node:test';
import assert from 'node:assert/strict';
import { academyCaseCard, SUPPORTED_CASE_IDS } from '../academy-case-card.mjs';

const link = (card) => card.attachments[0].content.actions[0];

test('only two existing Academy cases are distributed', () => {
  assert.deepEqual(SUPPORTED_CASE_IDS, ['report-or-evidence', 'same-scope']);
  for (const id of SUPPORTED_CASE_IDS) {
    assert.equal(link(academyCaseCard(id)).url, `https://academy.witnessops.com/academy/learn/${id}`);
  }
});

test('all links use the canonical Academy host, without tokens or query data', () => {
  for (const id of SUPPORTED_CASE_IDS) {
    const target = new URL(link(academyCaseCard(id)).url);
    assert.equal(target.origin, 'https://academy.witnessops.com');
    assert.equal(target.search, '');
    assert.equal(target.hash, '');
    assert.equal(target.username, '');
    assert.equal(target.password, '');
  }
});

test('rejects arbitrary case identifiers, URL injection, and untrusted metadata', () => {
  for (const id of ['../admin', 'https://evil.test', 'report-or-evidence?token=123', '__proto__', '', null, 42, { toString: () => 'report-or-evidence' }]) {
    assert.throws(() => academyCaseCard(id), RangeError);
  }
});

test('Teams message is a single Adaptive Card with one explicit open action', () => {
  const message = academyCaseCard('report-or-evidence');
  assert.equal(message.type, 'message');
  assert.equal(message.attachments.length, 1);
  const attachment = message.attachments[0];
  assert.equal(attachment.contentType, 'application/vnd.microsoft.card.adaptive');
  assert.equal(attachment.content.version, '1.4');
  assert.deepEqual(attachment.content.actions.map((a) => a.type), ['Action.OpenUrl']);
});

test('card contains no credential, learner identifier, score, or hidden workflow action', () => {
  const text = JSON.stringify(academyCaseCard('report-or-evidence'));
  for (const forbidden of ['Authorization', 'Bearer ', 'access_token', 'identityId', 'learnerId', 'Action.Execute', 'Action.Submit', 'http://']) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test('card data is deterministic and produces independent objects per request', () => {
  const first = academyCaseCard('same-scope');
  const second = academyCaseCard('same-scope');
  assert.deepEqual(first, second);
  first.attachments[0].content.body[1].text = 'Modified';
  assert.equal(second.attachments[0].content.body[1].text, 'Same record, wrong scope?');
});
