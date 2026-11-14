import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionStore } from '../src/session-store.mjs';

const ISS = 'https://idp.example/realms/academy';

function transport() {
  return { closed: false, close() { this.closed = true; return Promise.resolve(); } };
}

test('one learner at the per-user cap does not block a second learner', () => {
  const store = createSessionStore({ maxSessions: 10, maxPerUser: 2, idleMs: 1000 });
  const open = (sub, id) => {
    const admission = store.prepare(ISS, sub);
    assert.equal(admission.ok, true);
    store.commit(admission.ticket, id, { transport: transport() });
  };
  open('learner-a', 'a1');
  open('learner-a', 'a2');
  open('learner-a', 'a3');
  assert.equal(store.get('a1'), undefined);
  assert.equal(store.countFor(ISS, 'learner-a'), 2);
  open('learner-b', 'b1');
  assert.equal(store.countFor(ISS, 'learner-b'), 1);
  assert.equal(store.get('a2').sub, 'learner-a');
});

test('the oldest session is the one evicted when a learner is at the cap', () => {
  let now = 10;
  const store = createSessionStore({ maxSessions: 10, maxPerUser: 1, idleMs: 1000, now: () => now });
  const firstTransport = transport();
  const first = store.prepare(ISS, 'learner-a');
  store.commit(first.ticket, 'old', { transport: firstTransport });
  now = 20;
  const next = store.prepare(ISS, 'learner-a');
  assert.equal(next.ok, true);
  assert.equal(store.get('old'), undefined);
  assert.equal(firstTransport.closed, true);
  store.commit(next.ticket, 'new', { transport: transport() });
  assert.equal(store.countFor(ISS, 'learner-a'), 1);
  assert.equal(store.get('new').sub, 'learner-a');
});

test('close and expiry decrement the learner count', () => {
  let now = 0;
  const store = createSessionStore({ maxSessions: 10, maxPerUser: 5, idleMs: 10, now: () => now });
  const opened = store.prepare(ISS, 'learner-a');
  store.commit(opened.ticket, 's1', { transport: transport() });
  assert.equal(store.countFor(ISS, 'learner-a'), 1);
  assert.equal(store.close('s1'), true);
  assert.equal(store.countFor(ISS, 'learner-a'), 0);
  assert.equal(store.size, 0);

  const again = store.prepare(ISS, 'learner-a');
  store.commit(again.ticket, 's2', { transport: transport() });
  store.touch('s2', 0);
  now = 11;
  store.reap();
  assert.equal(store.countFor(ISS, 'learner-a'), 0);
  assert.equal(store.size, 0);
});

test('a full global store rejects the next learner and leaves the first in place', () => {
  const store = createSessionStore({ maxSessions: 1, maxPerUser: 5, idleMs: 1000 });
  const first = store.prepare(ISS, 'learner-a');
  store.commit(first.ticket, 'a1', { transport: transport() });
  const blocked = store.prepare(ISS, 'learner-b');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 503);
  assert.equal(store.countFor(ISS, 'learner-a'), 1);
  assert.equal(store.countFor(ISS, 'learner-b'), 0);
});

test('the same subject at two issuers does not share a cap', () => {
  const store = createSessionStore({ maxSessions: 10, maxPerUser: 1, idleMs: 1000 });
  const first = store.prepare('https://idp-a.example', 'learner');
  assert.equal(first.ok, true);
  store.commit(first.ticket, 'a', { transport: transport() });
  const second = store.prepare('https://idp-b.example', 'learner');
  assert.equal(second.ok, true);
  store.commit(second.ticket, 'b', { transport: transport() });
  assert.equal(store.countFor('https://idp-a.example', 'learner'), 1);
  assert.equal(store.countFor('https://idp-b.example', 'learner'), 1);
  assert.equal(store.get('a').iss, 'https://idp-a.example');
  assert.equal(store.get('b').iss, 'https://idp-b.example');
  const third = store.prepare('https://idp-a.example', 'learner');
  assert.equal(store.get('a'), undefined);
  store.commit(third.ticket, 'a2', { transport: transport() });
  assert.equal(store.get('b').sub, 'learner');
});
