// Configuration helpers. Secrets are NEVER taken from plain env values: only from a file named by
// <NAME>_FILE, or from systemd credentials ($CREDENTIALS_DIRECTORY/<name in lower case>).
import fs from 'node:fs';

export function env(name, def) {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  if (def !== undefined) return def;
  throw new Error(`missing required env ${name}`);
}
export function secret(name) {
  const file = process.env[`${name}_FILE`];
  if (file) return fs.readFileSync(file, 'utf8').trim();
  const dir = process.env.CREDENTIALS_DIRECTORY;
  if (dir && fs.existsSync(`${dir}/${name.toLowerCase()}`)) return fs.readFileSync(`${dir}/${name.toLowerCase()}`, 'utf8').trim();
  throw new Error(`missing secret ${name}: set ${name}_FILE or provide a systemd credential named ${name.toLowerCase()}`);
}
export const bool = (name, def) => { const v = process.env[name]; return v === undefined || v === '' ? def : /^(1|true|yes|on)$/i.test(v); };
export const int = (name, def) => { const n = Number(env(name, String(def))); if (!Number.isSafeInteger(n)) throw new Error(`env ${name} must be an integer`); return n; };
export const list = (name, def) => env(name, def).split(',').map((s) => s.trim()).filter(Boolean);
export const isLoopback = (u) => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(new URL(u).hostname);
// Plain HTTP is accepted only for loopback URLs (local development / sandbox). Anything else must be HTTPS.
export function requireHttpsOrLoopback(name, u) {
  const url = new URL(u);
  if (url.protocol === 'https:') return url;
  if (url.protocol === 'http:' && isLoopback(u)) return url;
  throw new Error(`${name} must be https:// (plain http is allowed only on loopback): ${u}`);
}
