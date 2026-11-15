import crypto from 'node:crypto';

const MAX_BYTES = 128 * 1024;
const KEY_ID = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, fields) => plain(x) && Object.keys(x).length === fields.length && fields.every(k => Object.hasOwn(x, k));
const invalid = () => Object.assign(new Error('session_token_protection_failed'), { code: 'session_token_protection_failed' });

/** A separate random 256-bit keyring, supplied only via the existing secret-file loader. */
export function createSessionTokenCodec(secretValue, { issuer, clientId }) {
  let ring;
  try { ring = JSON.parse(secretValue); } catch { throw new Error('invalid Academy token keyring'); }
  if (!exact(ring, ['active', 'keys']) || !KEY_ID.test(ring.active) || !plain(ring.keys)) throw new Error('invalid Academy token keyring');
  const entries = Object.entries(ring.keys);
  if (entries.length < 1 || entries.length > 8) throw new Error('invalid Academy token keyring');
  const keys = new Map();
  for (const [id, encoded] of entries) {
    if (!KEY_ID.test(id) || typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('invalid Academy token keyring');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('invalid Academy token keyring');
    keys.set(id, key);
  }
  if (!keys.has(ring.active) || typeof issuer !== 'string' || !issuer || typeof clientId !== 'string' || !clientId) throw new Error('invalid Academy token keyring');
  const aad = (row, id) => {
    if (!row || !/^[a-f0-9]{64}$/.test(row.token_hash) || typeof row.identity_id !== 'string' || !row.identity_id) throw invalid();
    return Buffer.from(JSON.stringify(['academy-session-tokens', 1, issuer, clientId, row.token_hash, row.identity_id, id]));
  };
  const validTokens = tokens => exact(tokens, ['id_token', 'access_token', 'refresh_token'])
    && Object.values(tokens).every(t => typeof t === 'string' && t.length > 0 && Buffer.byteLength(t) <= MAX_BYTES);
  function seal(tokens, row) {
    if (!validTokens(tokens)) throw invalid();
    const input = JSON.stringify(tokens);
    if (Buffer.byteLength(input) > MAX_BYTES) throw invalid();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keys.get(ring.active), iv);
    cipher.setAAD(aad(row, ring.active));
    const body = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]);
    return ['v1', ring.active, iv.toString('base64url'), body.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  }
  function open(envelope, row) {
    try {
      if (typeof envelope !== 'string' || envelope.length > MAX_BYTES * 2) throw invalid();
      const parts = envelope.split('.');
      if (parts.length !== 5 || parts[0] !== 'v1' || !keys.has(parts[1])) throw invalid();
      const decode = s => {
        if (!/^[A-Za-z0-9_-]+$/.test(s)) throw invalid();
        const bytes = Buffer.from(s, 'base64url');
        if (bytes.toString('base64url') !== s) throw invalid();
        return bytes;
      };
      const [, id, ivText, bodyText, tagText] = parts;
      const iv = decode(ivText), body = decode(bodyText), tag = decode(tagText);
      if (iv.length !== 12 || tag.length !== 16 || body.length > MAX_BYTES) throw invalid();
      const decipher = crypto.createDecipheriv('aes-256-gcm', keys.get(id), iv);
      decipher.setAAD(aad(row, id));
      decipher.setAuthTag(tag);
      const tokens = JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8'));
      if (!validTokens(tokens)) throw invalid();
      return { tokens, needsRewrap: id !== ring.active };
    } catch { throw invalid(); }
  }
  return { seal, open };
}

/** The explicit cutover validates this constraint only after clearing legacy token columns. */
export async function assertTokenStorageReady(pool) {
  const { rows } = await pool.query(`SELECT convalidated FROM pg_constraint
    WHERE conrelid=to_regclass('public.academy_sessions') AND conname='academy_sessions_no_plain_tokens'`);
  if (rows.length !== 1 || rows[0].convalidated !== true) throw new Error('Academy session token cutover is required');
}
