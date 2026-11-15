const APPROVED_PILOT = 'approved-free-pilot';
const SESSION_ONLY = 'session-only';

export function requireAccessPolicy(value = APPROVED_PILOT) {
  if (value !== APPROVED_PILOT && value !== SESSION_ONLY) {
    throw new Error('Unknown Academy access policy');
  }
  return value;
}

const denial = (error, status) => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ error, status }) }],
  structuredContent: { error, status },
});

/** The database exposes only a boolean, not invitation or grant records. */
export async function hasPilotAdmission(db, owner) {
  const result = await db.query(
    'SELECT public.academy_has_approved_free_grant($1::uuid) AS admitted',
    [owner],
  );
  return result.rows.length === 1 && result.rows[0].admitted === true;
}

/** Check required migration and EXECUTE rights before opening the listener. */
export async function assertPilotAccessReady(db, policy) {
  requireAccessPolicy(policy);
  if (policy === APPROVED_PILOT) {
    const result = await db.query(
      'SELECT public.academy_has_approved_free_grant(NULL::uuid) AS admitted',
    );
    if (result.rows.length !== 1 || result.rows[0].admitted !== false) {
      throw new Error('Academy pilot admission is unavailable');
    }
  }
}

/**
 * Every tool invocation rechecks access, including calls on an existing MCP
 * session. The owner comes only from validated token identity, never arguments.
 * The returned owner also avoids a second identity lookup in draft handlers.
 */
export function withPilotAdmission({ db, policy, ownerId }, handler) {
  requireAccessPolicy(policy);
  return async (args, extra) => {
    let owner;
    if (policy === APPROVED_PILOT) {
      try {
        owner = await ownerId(extra.authInfo);
        if (!await hasPilotAdmission(db, owner)) return denial('access_required', 403);
      } catch {
        return denial('access_unavailable', 503);
      }
    }
    return handler(args, extra, owner);
  };
}
