import { createHash, randomBytes } from 'node:crypto';

export const TEAMS_LINK_INTENT_TTL_SECONDS = 5 * 60;

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLAIM_FIELDS = new Set(['tenantId', 'objectId', 'subject', 'issuer']);

export class TeamsLinkInputError extends Error {
  constructor(code = 'invalid_teams_link_input') {
    super(code);
    this.name = 'TeamsLinkInputError';
    this.code = code;
  }
}

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => record(value)
  && Object.keys(value).length === fields.size
  && Object.keys(value).every(key => fields.has(key));

function boundedText(value, maximum) {
  return typeof value === 'string' && value.isWellFormed()
    && value.length >= 1 && value.length <= maximum
    && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}

function uuid(value) {
  if (typeof value !== 'string' || !UUID_RE.test(value)
    || value === '00000000-0000-0000-0000-000000000000') {
    throw new TeamsLinkInputError();
  }
  return value;
}

function entraClaims(value) {
  if (!exact(value, CLAIM_FIELDS)) throw new TeamsLinkInputError();
  const tenantId = uuid(value.tenantId);
  const objectId = uuid(value.objectId);
  if (!boundedText(value.subject, 256) || !boundedText(value.issuer, 2048)) {
    throw new TeamsLinkInputError();
  }
  if (value.issuer !== `https://login.microsoftonline.com/${tenantId}/v2.0`) {
    throw new TeamsLinkInputError();
  }
  return { tenantId, objectId, subject: value.subject, issuer: value.issuer };
}

function identityId(value) {
  return uuid(value);
}

export function teamsLinkTokenHash(token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) throw new TeamsLinkInputError();
  const bytes = Buffer.from(token, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== token) throw new TeamsLinkInputError();
  return createHash('sha256').update(token, 'ascii').digest('hex');
}

const unavailable = () => ({ ok: false, error: 'teams_link_unavailable' });

export async function createTeamsLinkIntent(db, input) {
  const claims = entraClaims(input);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = teamsLinkTokenHash(token);
  const row = (await db.query(
    'SELECT * FROM public.academy_create_teams_link_intent($1::text,$2::text,$3::uuid,$4::uuid,$5::text)',
    [tokenHash, claims.issuer, claims.tenantId, claims.objectId, claims.subject],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true, token, expiresAt: row.expires_at };
}

export async function previewTeamsLinkIntent(db, input) {
  if (!exact(input, new Set(['token']))) throw new TeamsLinkInputError();
  const row = (await db.query(
    'SELECT * FROM public.academy_preview_teams_link_intent($1::text)',
    [teamsLinkTokenHash(input.token)],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true, expiresAt: row.expires_at };
}

export async function confirmTeamsLinkIntent(db, input) {
  if (!exact(input, new Set(['token', 'identityId']))) throw new TeamsLinkInputError();
  const row = (await db.query(
    'SELECT * FROM public.academy_confirm_teams_link_intent($1::text,$2::uuid)',
    [teamsLinkTokenHash(input.token), identityId(input.identityId)],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true };
}

export async function resolveTeamsIdentityLink(db, input) {
  const claims = entraClaims(input);
  const row = (await db.query(
    'SELECT * FROM public.academy_resolve_teams_identity_link($1::text,$2::uuid,$3::uuid,$4::text)',
    [claims.issuer, claims.tenantId, claims.objectId, claims.subject],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true, identityId: row.identity_id };
}

export async function hasTeamsIdentityLink(db, input) {
  if (!exact(input, new Set(['identityId']))) throw new TeamsLinkInputError();
  const row = (await db.query(
    'SELECT public.academy_has_teams_identity_link($1::uuid) AS linked',
    [identityId(input.identityId)],
  )).rows[0];
  return row?.linked === true;
}

export async function revokeTeamsIdentityLink(db, input) {
  if (!exact(input, new Set(['identityId']))) throw new TeamsLinkInputError();
  const row = (await db.query(
    'SELECT * FROM public.academy_revoke_teams_identity_link($1::uuid)',
    [identityId(input.identityId)],
  )).rows[0];
  if (!row) return unavailable();
  return { ok: true };
}
