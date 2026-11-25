import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// One canonical markup/CSS file, used unchanged by MCP Apps and Matrix/Element.
const html = readFileSync(new URL('./decision-room.html', import.meta.url), 'utf8');
const adapter = readFileSync(new URL('./matrix-widget-adapter.js', import.meta.url), 'utf8');
const SCRIPT_OPEN = '<script>', SCRIPT_CLOSE = '</' + 'script>';
const scriptStart = html.indexOf(SCRIPT_OPEN), scriptEnd = html.indexOf(SCRIPT_CLOSE, scriptStart);
if (scriptStart < 0 || scriptEnd < 0 || html.split(SCRIPT_OPEN).length !== 2 || !html.includes('<style>')) {
  throw new Error('Academy Decision Room markup does not match the reviewed single-script contract');
}
/** The single reviewed inline script, extracted by position (no HTML-matching regex). */
export const DECISION_ROOM_SCRIPT = html.slice(scriptStart + SCRIPT_OPEN.length, scriptEnd);
const digest = text => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const scripts = `${digest(adapter)} ${digest(DECISION_ROOM_SCRIPT)}`;
const originPattern = /^https?:\/\/[^/?#]+\/?$/;

/** Exact origins only. No wildcard, path, query, fragment, credentials or insecure remote hosts. */
export function matrixWidgetOrigins(raw = '') {
  if (typeof raw !== 'string') throw new Error('Invalid Matrix widget origin setting');
  if (!raw.trim()) return [];
  const values = raw.split(',').map(value => value.trim());
  if (values.length > 4 || values.some(v => !v || !originPattern.test(v))) throw new Error('Invalid Matrix widget origin allowlist');
  return [...new Set(values.map(value => {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
        || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')))
      throw new Error('Invalid Matrix widget origin: HTTPS is required outside loopback');
    if (url.hostname.endsWith('.')) throw new Error('Invalid Matrix widget origin: trailing-dot host');
    if (value.replace(/\/$/, '') !== url.origin) throw new Error('Noncanonical Matrix widget origin');
    return url.origin;
  }))];
}

/** Scoped policy only for the opt-in lesson iframe. All other Academy pages keep DENY. */
export function matrixWidgetCsp(origins) {
  if (!Array.isArray(origins) || origins.length === 0) throw new Error('Matrix widget is disabled');
  // Existing visual CSS contains inline styles; limit the style exception to this route.
  return `default-src 'none'; script-src ${scripts}; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors ${origins.join(' ')}`;
}

export function matrixWidgetHtml(csrfToken) {
  if (typeof csrfToken !== 'string' || !csrfToken) throw new Error('Authenticated Academy session required');
  const token = JSON.stringify(csrfToken).replaceAll('<', '\\u003c');
  const insert = `<script type="application/json" id="academy-csrf">${token}</script>\n<script>${adapter}</script>\n<script>`;
  // Function replacer: `$&`, `$'` etc. in the token or adapter are never expanded.
  const result = html.replace(SCRIPT_OPEN, () => insert);
  if (result === html) throw new Error('Missing Decision Room script insertion point');
  return result;
}

/** Response headers for the opt-in widget only. Every other Academy route keeps X-Frame-Options: DENY. */
export function matrixWidgetHeaders(origins, { secure = false } = {}) {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': matrixWidgetCsp(origins),
    ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  };
}

/**
 * Decide the `?format=matrix` lesson response. Denials return `{ status, json }`
 * so the caller sends them through the normal DENY-framed JSON path.
 */
export async function matrixWidgetResponse({ lesson, origins, method, getSession, hasGrant, requiresGrant, secure = false }) {
  if (lesson?.id !== 'report-or-evidence' || !Array.isArray(origins) || origins.length === 0) return { status: 404, json: { error: 'not_found' } };
  const session = await getSession();
  if (!session || (requiresGrant && !await hasGrant(session))) return { status: 403, json: { error: 'access_required' } };
  const body = matrixWidgetHtml(session.csrf_token);
  return { status: 200, headers: matrixWidgetHeaders(origins, { secure }), body: method === 'HEAD' ? undefined : body };
}
