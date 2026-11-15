import { createHash, randomBytes } from 'node:crypto';

export const PILOT_COURSE_ID = 'verify-results-pilot';
export const MAX_PILOT_LEARNERS = 4;
export const MAX_INVITATION_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH_FIELDS = new Set(['recipients', 'approvalReference', 'administratorReference', 'expiresInSeconds']);
const RECIPIENT_FIELDS = new Set(['issuer', 'subject']);

export class InvitationInputError extends Error {
  constructor(code = 'invalid_invitation_input') {
    super(code);
    this.name = 'InvitationInputError';
    this.code = code;
  }
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value, maximum) {
  return typeof value === 'string' && value.isWellFormed() && value.length >= 1 && value.length <= maximum
    && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}

function reference(value) {
  if (!boundedText(value, 500)) throw new InvitationInputError('approval_reference_required');
  return value;
}

function identityId(value) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw new InvitationInputError();
  return value.toLowerCase();
}

function recipient(value) {
  if (!record(value) || Object.keys(value).some((key) => !RECIPIENT_FIELDS.has(key))
    || !boundedText(value.issuer, 2048) || !boundedText(value.subject, 255)) {
    throw new InvitationInputError();
  }
  let url;
  try { url = new URL(value.issuer); } catch { throw new InvitationInputError(); }
  const localHttp = url.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password || url.hash || url.search) {
    throw new InvitationInputError();
  }
  // Preserve the exact verified issuer/subject strings. Email is not an owner key.
  return { issuer: value.issuer, subject: value.subject };
}

export function validateInvitationBatch(input) {
  if (!record(input) || Object.keys(input).some((key) => !BATCH_FIELDS.has(key))
    || !Array.isArray(input.recipients) || input.recipients.length < 1
    || input.recipients.length > MAX_PILOT_LEARNERS) throw new InvitationInputError();
  const recipients = input.recipients.map(recipient);
  const unique = new Set(recipients.map((item) => JSON.stringify([item.issuer, item.subject])));
  if (unique.size !== recipients.length) throw new InvitationInputError('duplicate_recipient');
  const expiresInSeconds = input.expiresInSeconds ?? MAX_INVITATION_SECONDS;
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 1
    || expiresInSeconds > MAX_INVITATION_SECONDS) throw new InvitationInputError();
  return {
    recipients,
    approvalReference: reference(input.approvalReference),
    administratorReference: reference(input.administratorReference),
    expiresInSeconds,
  };
}

export function invitationTokenHash(token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) throw new InvitationInputError();
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== token) throw new InvitationInputError();
  return createHash('sha256').update(token, 'ascii').digest('hex');
}

function unavailable() {
  // Wrong recipient, missing, expired, revoked and reused links share one public denial.
  return { ok: false, eligible: false, accepted: false, error: 'invitation_unavailable' };
}

/**
 * Operator-only preparation. Never wire this to a learner-accessible HTTP route.
 * The database user must be an authorized owner/migrator, never academy_app.
 * Returns each bearer once for private captured delivery; no bearer is stored in PostgreSQL.
 */
export async function createInvitationBatch(operatorDb, input) {
  const valid = validateInvitationBatch(input);
  const client = await operatorDb.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(17465201, 4)');
    const issuerList = valid.recipients.map((item) => item.issuer);
    const subjectList = valid.recipients.map((item) => item.subject);
    const state = (await client.query(`
      WITH requested AS (
        SELECT * FROM ROWS FROM (pg_catalog.unnest($1::text[]), pg_catalog.unnest($2::text[])) AS r(issuer, subject)
      ), reserved AS (
        SELECT i.recipient_issuer AS issuer, i.recipient_subject AS subject
        FROM public.academy_pilot_invitations i
        WHERE i.revoked_at IS NULL AND i.redeemed_at IS NULL
          AND i.expires_at > pg_catalog.clock_timestamp()
        UNION
        SELECT i.issuer, i.subject
        FROM public.academy_pilot_grants g
        JOIN public.academy_identities i ON i.id = g.identity_id
        WHERE g.revoked_at IS NULL
      )
      SELECT
        (SELECT count(*)::integer FROM (
          SELECT issuer, subject FROM reserved
          UNION SELECT issuer, subject FROM requested
        ) capacity) AS reserved_count,
        EXISTS (
          SELECT 1 FROM requested r JOIN public.academy_pilot_invitations i
            ON i.recipient_issuer = r.issuer AND i.recipient_subject = r.subject
          WHERE i.revoked_at IS NULL AND i.redeemed_at IS NULL
            AND i.expires_at > pg_catalog.clock_timestamp()
        ) OR EXISTS (
          SELECT 1 FROM requested r JOIN public.academy_identities i
            ON i.issuer = r.issuer AND i.subject = r.subject
          JOIN public.academy_pilot_grants g ON g.identity_id = i.id
        ) AS recipient_already_recorded
    `, [issuerList, subjectList])).rows[0];
    if (state.recipient_already_recorded) throw new InvitationInputError('recipient_already_recorded');
    if (state.reserved_count > MAX_PILOT_LEARNERS) throw new InvitationInputError('pilot_capacity');
    const invitations = [];
    for (const intendedRecipient of valid.recipients) {
      const token = randomBytes(32).toString('base64url');
      const row = (await client.query(`
        INSERT INTO public.academy_pilot_invitations (
          token_hash, recipient_issuer, recipient_subject, approval_reference,
          administrator_reference, expires_at
        ) VALUES ($1, $2, $3, $4, $5,
          pg_catalog.statement_timestamp() + $6::integer * interval '1 second')
        RETURNING id, course_id, access_kind, role, expires_at
      `, [
        invitationTokenHash(token), intendedRecipient.issuer, intendedRecipient.subject,
        valid.approvalReference, valid.administratorReference, valid.expiresInSeconds,
      ])).rows[0];
      invitations.push({
        invitationId: row.id, courseId: row.course_id, accessKind: row.access_kind,
        role: row.role, expiresAt: row.expires_at, token,
      });
    }
    await client.query('COMMIT');
    return { ok: true, invitations };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** identityId must be derived from a verified server session, never a request owner field. */
export async function previewInvitation(runtimeDb, input) {
  if (!record(input) || Object.keys(input).some((key) => !['token', 'identityId'].includes(key))) {
    throw new InvitationInputError();
  }
  const hash = invitationTokenHash(input.token);
  const owner = identityId(input.identityId);
  const row = (await runtimeDb.query(
    'SELECT * FROM public.academy_preview_pilot_invitation($1::text, $2::uuid)',
    [hash, owner],
  )).rows[0];
  if (!row) return unavailable();
  return {
    ok: true, eligible: true, invitationId: row.invitation_id, courseId: PILOT_COURSE_ID,
    accessKind: 'approved_free', role: 'learner', expiresAt: row.expires_at,
  };
}

/** One SQL function call performs the locked check, grant and token consumption atomically. */
export async function redeemInvitation(runtimeDb, input) {
  if (!record(input) || Object.keys(input).some((key) => !['token', 'identityId'].includes(key))) {
    throw new InvitationInputError();
  }
  const hash = invitationTokenHash(input.token);
  const owner = identityId(input.identityId);
  const row = (await runtimeDb.query(
    'SELECT * FROM public.academy_redeem_pilot_invitation($1::text, $2::uuid)',
    [hash, owner],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true, accepted: true, invitationId: row.invitation_id, grantId: row.grant_id, courseId: PILOT_COURSE_ID };
}

/** Owner-only action; revoking an invitation never silently revokes an existing grant. */
export async function revokeInvitation(operatorDb, { invitationId, administratorReference }) {
  const id = identityId(invitationId);
  const admin = reference(administratorReference);
  const row = (await operatorDb.query(`
    UPDATE public.academy_pilot_invitations
      SET revoked_at = pg_catalog.clock_timestamp(), revocation_reference = $2
    WHERE id = $1 AND revoked_at IS NULL AND redeemed_at IS NULL
    RETURNING id
  `, [id, admin])).rows[0];
  return { ok: Boolean(row) };
}

/** Owner-only lifecycle action, separate from invitation revocation. Saved work is preserved. */
export async function revokeFreeGrant(operatorDb, { identityId: suppliedIdentity, administratorReference }) {
  const owner = identityId(suppliedIdentity);
  const admin = reference(administratorReference);
  const row = (await operatorDb.query(`
    UPDATE public.academy_pilot_grants
      SET revoked_at = pg_catalog.clock_timestamp(), revocation_reference = $2
    WHERE identity_id = $1 AND course_id = $3 AND revoked_at IS NULL
    RETURNING id
  `, [owner, admin, PILOT_COURSE_ID])).rows[0];
  return { ok: Boolean(row) };
}

export async function hasApprovedFreeGrant(runtimeDb, { identityId: suppliedIdentity }) {
  const owner = identityId(suppliedIdentity);
  return Boolean((await runtimeDb.query(`
    SELECT 1 FROM public.academy_pilot_grants
    WHERE identity_id = $1 AND course_id = $2
      AND access_kind = 'approved_free' AND role = 'learner' AND revoked_at IS NULL
  `, [owner, PILOT_COURSE_ID])).rows[0]);
}

/** Captured test email only. Fragment tokens stay out of HTTP request logs/referrers. */
export function renderCapturedInvitationEmail({ token, academyOrigin, recipientEmail }) {
  invitationTokenHash(token);
  if (!boundedText(recipientEmail, 254) || !/^[^\s@]+@[^\s@]+\.invalid$/.test(recipientEmail)) {
    throw new InvitationInputError('captured_email_only');
  }
  let origin;
  try { origin = new URL(academyOrigin); } catch { throw new InvitationInputError(); }
  const loopbackHttp = origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if (origin.origin !== academyOrigin || (origin.protocol !== 'https:' && !loopbackHttp) || origin.username || origin.password) {
    throw new InvitationInputError();
  }
  const link = new URL('/academy/invitation', origin);
  link.hash = `token=${token}`;
  return {
    captured: true, to: recipientEmail, subject: 'Your approved free WitnessOps Academy pilot invitation',
    text: `This captured test invitation is for the owner-approved pilot course only. Sign in with your intended account, then review and accept the invitation. It does not grant paid, administrator or community access.\n\n${link.href}\n\nThis is a test capture, not delivered email.`,
  };
}


