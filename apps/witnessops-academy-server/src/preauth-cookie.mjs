import crypto from 'node:crypto';

export function preauthKeyFromSecret(secretValue) {
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
    return payload;
  } catch {
    return null;
  }
}
