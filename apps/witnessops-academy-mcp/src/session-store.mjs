// Per-learner cap, with the global cap as a backstop. A learner at their cap
// loses their oldest session so a different learner is not locked out.
export function createSessionStore({ maxSessions, maxPerUser, idleMs, now = () => Date.now() }) {
  if (!Number.isSafeInteger(maxSessions) || maxSessions < 1) throw new Error('maxSessions must be a positive integer');
  if (!Number.isSafeInteger(maxPerUser) || maxPerUser < 1) throw new Error('maxPerUser must be a positive integer');
  const sessions = new Map();
  const pending = [];

  function countFor(sub) {
    let count = 0;
    for (const session of sessions.values()) if (session.sub === sub) count += 1;
    for (const ticket of pending) if (ticket.sub === sub) count += 1;
    return count;
  }

  function oldestFor(sub) {
    let oldest = null;
    for (const [id, session] of sessions) {
      if (session.sub !== sub) continue;
      if (!oldest || session.opened < oldest.session.opened) oldest = { id, session };
    }
    return oldest;
  }

  function drop(id) {
    const session = sessions.get(id);
    if (!session) return false;
    sessions.delete(id);
    Promise.resolve(session.transport?.close?.()).catch(() => {});
    return true;
  }

  function reap(at = now()) {
    for (const [id, session] of [...sessions]) {
      if (at - session.last > idleMs) drop(id);
    }
  }

  function prepare(sub, at = now()) {
    reap(at);
    while (countFor(sub) >= maxPerUser) {
      const oldest = oldestFor(sub);
      if (!oldest) return { ok: false, status: 429, error: 'too_many_sessions_for_user' };
      drop(oldest.id);
    }
    if (sessions.size + pending.length >= maxSessions) {
      return { ok: false, status: 503, error: 'too_many_sessions' };
    }
    const ticket = { sub };
    pending.push(ticket);
    return { ok: true, ticket };
  }

  function commit(ticket, id, fields, at = now()) {
    const index = pending.indexOf(ticket);
    if (index >= 0) pending.splice(index, 1);
    sessions.set(id, {
      transport: fields.transport,
      iss: fields.iss,
      sub: fields.sub,
      last: at,
      opened: at,
    });
  }

  function cancel(ticket) {
    const index = pending.indexOf(ticket);
    if (index >= 0) pending.splice(index, 1);
  }

  function close(id) {
    return drop(id);
  }

  function touch(id, at = now()) {
    const session = sessions.get(id);
    if (!session) return false;
    session.last = at;
    return true;
  }

  function get(id) {
    return sessions.get(id);
  }

  return {
    prepare,
    commit,
    cancel,
    close,
    reap,
    touch,
    get,
    countFor,
    get size() { return sessions.size; },
  };
}
