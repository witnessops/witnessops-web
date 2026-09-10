// Browser-only convenience validation. The unchanged server validator and public-IP
// gate remain authoritative. Nothing in this handoff authorizes a network request.
export const ASK_CHECK_KEY = 'witnessops.ask-check.v1';
export const ASK_CHECK_TTL = 10 * 60 * 1000;
export function normalizeAskHostname(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value || input.length > 512 || /[\s/@:#?\\\[\]%]/u.test(value)) throw new Error('Enter a hostname without a scheme, path, port or credentials.');
  const raw = value.endsWith('.') ? value.slice(0, -1) : value;
  let host: string;
  try { host = new URL('https://' + raw).hostname; } catch { throw new Error('Enter a valid public hostname.'); }
  const labels = host.split('.');
  if (host.length > 253 || labels.length < 2 || /^\d+$/u.test(labels.at(-1)!) || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)) ||
    ['localhost','local','internal','intranet','home','lan','invalid','test','example','onion','alt','arpa'].some(suffix => host === suffix || host.endsWith('.' + suffix))) throw new Error('Enter a valid public hostname, not an IP or reserved name.');
  return host;
}
export type AskCheckContext = { hostname: string; email: string; authorized: true; expiresAt: number };
export function rememberAskCheck(storage: Pick<Storage, 'setItem' | 'removeItem'>, hostname: string, email: string, authorized: boolean, now = Date.now()): string {
  if (!authorized) throw new Error('Confirm that you own this hostname or are authorized to check it.');
  const host = normalizeAskHostname(hostname);
  const contact = email.trim();
  if (contact && (contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact))) throw new Error('Enter a valid email or leave it blank.');
  storage.removeItem(ASK_CHECK_KEY);
  storage.setItem(ASK_CHECK_KEY, JSON.stringify({ hostname: host, email: contact, authorized: true, expiresAt: now + ASK_CHECK_TTL }));
  return '/check?hostname=' + encodeURIComponent(host) + '&source=ask';
}
/** Consume once; expired, mismatched or malformed context never supplies email. */
export function takeAskCheck(storage: Pick<Storage, 'getItem' | 'removeItem'>, hostname: string, now = Date.now()): AskCheckContext | null {
  try {
    const raw = storage.getItem(ASK_CHECK_KEY); storage.removeItem(ASK_CHECK_KEY);
    if (!raw || raw.length > 2048) return null;
    const x = JSON.parse(raw) as AskCheckContext;
    if (x.hostname !== hostname || x.authorized !== true || typeof x.email !== 'string' || x.email.length > 254 || !Number.isFinite(x.expiresAt) || x.expiresAt <= now || x.expiresAt > now + ASK_CHECK_TTL) return null;
    return x;
  } catch { return null; }
}
