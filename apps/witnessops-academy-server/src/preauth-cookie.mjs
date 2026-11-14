import crypto from 'node:crypto';

export const PREAUTH_TTL_MS = 5 * 60 * 1000;
export const PREAUTH_USED_MAX = 1024;

export function preauthKeyFromSecret(secretValue) {
  if (Buffer.byteLength(String(secretValue ?? ''), 'utf8') < 32) {
    throw new Error('ACADEMY_PREAUTH_KEY must be at least 32 bytes');
  }
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(String(secretValue), 'utf8'),
    Buffer.from('academy-preauth-salt'),
    'academy-preauth-v1',
    32,
  ));
}

export function sealPreauth(payload, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, body, tag]).toString('base64url');
}

export function openPreauth(token, key, now = Date.now()) {
  try {
    const buf = Buffer.from(String(token), 'base64url');
    if (buf.length < 12 + 16) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const data = buf.subarray(12, buf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'));
    if (!payload || typeof payload.state !== 'string' || typeof payload.nonce !== 'string' || typeof payload.verifier !== 'string') return null;
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
    if (typeof payload.id !== 'string' || payload.id === '') return null;
    return payload;
  } catch {
    return null;
  }
}

export function createPreauthCodec(key, options = {}) {
  const ttlMs = options.ttlMs ?? PREAUTH_TTL_MS;
  const maxUsed = options.maxUsed ?? PREAUTH_USED_MAX;
  const used = new Map();

  function sweep(now) {
    for (const [id, exp] of used) {
      if (exp <= now) used.delete(id);
    }
    while (used.size > maxUsed) {
      const oldest = used.keys().next().value;
      used.delete(oldest);
    }
  }

  return {
    seal(fields, now = Date.now()) {
      return sealPreauth({
        state: fields.state,
        nonce: fields.nonce,
        verifier: fields.verifier,
        id: crypto.randomBytes(16).toString('base64url'),
        exp: now + ttlMs,
      }, key);
    },
    open(token, now = Date.now()) {
      sweep(now);
      const payload = openPreauth(token, key, now);
      if (!payload) return null;
      if (payload.exp > now + ttlMs) return null;
      if (used.has(payload.id)) return null;
      while (used.size >= maxUsed) {
        const oldest = used.keys().next().value;
        used.delete(oldest);
      }
      used.set(payload.id, payload.exp);
      return payload;
    },
    usedSize: () => used.size,
  };
}
