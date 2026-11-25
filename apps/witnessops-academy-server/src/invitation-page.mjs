import { DEFAULT_LESSON, lessonByRoute } from './lesson-routes.mjs';
import { CHAT_ROUTE } from './lesson-chat-routes.mjs';
import { invitationTokenHash } from './pilot-invitations.mjs';

// Native POST needs an exact Origin; no-referrer serializes it as null in browsers.
// Only these pages use this override, after the fragment is removed by the controller.
export const INVITATION_PAGE_HEADERS = Object.freeze({ 'Referrer-Policy': 'same-origin' });
export const INVITATION_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export function accessPolicy(value = 'approved-free-pilot') {
  if (!['session-only', 'approved-free-pilot'].includes(value)) throw new Error('Invalid Academy access policy');
  return value;
}
export function invitationInput(body) {
  const token = body && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).length === 1 && typeof body.token === 'string'
    && INVITATION_TOKEN.test(body.token) ? body.token : null;
  if (!token) return null;
  try { invitationTokenHash(token); return token; } catch { return null; }
}
const jsonText = value => JSON.stringify(value).replaceAll('<', String.fromCharCode(92) + 'u003c');

// Fixed destinations: account, invitation and lesson content never enter support URLs.
export function supportLinks(lessonQuestion = false) {
  const subject = lessonQuestion ? 'Academy%20lesson%20question' : 'Academy%20help';
  return `<p><a href="https://witnessops.com/support#support-request" target="_blank" rel="noopener noreferrer">Contact support (opens in a new tab)</a>. Or email <a href="mailto:engage@mail.witnessops.com?subject=${subject}">engage@mail.witnessops.com</a>.</p>`;
}

const BROWSER_ERRORS = Object.freeze({
  login_state_missing: 'This sign-in attempt has expired or cannot be matched to this browser. Start sign-in again. If you were accepting an invitation, reopen its original link.',
  login_failed: 'Sign-in did not finish. Try again with your WitnessOps account. If you were accepting an invitation, reopen its original link.',
  email_verification_required: 'Your email has not been verified. Complete the verification email from WitnessOps, then sign in. If it did not arrive, ask for help below.',
  rate_limited: 'There have been too many sign-in attempts. Please wait before trying again.',
  idp_unavailable: 'Sign-in is temporarily unavailable. Try again later. If this continues, contact support.',
  internal: 'Academy could not open this page. Try again later, or contact support.',
});

// Only explicit browser navigation to existing page routes receives HTML.
// API callers, native form POSTs and other paths retain their JSON error contract.
export function browserErrorBody(req, code) {
  const json = { error: code };
  if (!['GET', 'HEAD'].includes(req.method) || !Object.hasOwn(BROWSER_ERRORS, code)) return json;
  let path;
  try { path = new URL(req.url, 'https://academy.invalid').pathname; } catch { return json; }
  if (!['/academy/auth/login', '/academy/auth/register', '/academy/auth/callback', '/academy/account', '/academy/invitation', CHAT_ROUTE].includes(path) && !lessonByRoute(path)) return json;
  const accept = typeof req.headers?.accept === 'string' ? req.headers.accept : '';
  const acceptsHtml = accept.split(',').some(value => {
    const [type, ...parameters] = value.trim().split(';');
    return type.trim().toLowerCase() === 'text/html'
      && !parameters.some(parameter => /^\s*q\s*=\s*0(?:\.0*)?\s*$/i.test(parameter));
  });
  if (req.headers?.['sec-fetch-mode'] !== 'navigate' && !acceptsHtml) return json;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Academy sign-in help · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Need help getting in?</h1><p role="status">${BROWSER_ERRORS[code]}</p>
<p><a class="btn" href="/academy/auth/login">Start sign-in again</a> <a href="/academy/account">Your account</a> <a href="/">Academy home</a></p>
<h2>Help without signing in</h2><p>Tell support which step failed and what you need help with. Choose what you share.</p>
${supportLinks()}</main></body></html>`;
}

// Only fixed text, the validated Community URL and an existing random CSRF token enter this page.
export function invitationPage(session, { denied = false, failed = false, lesson = DEFAULT_LESSON, communityUrl = null } = {}) {
  const community = session && communityUrl
    ? `<p><a id="community-link" class="btn ghost" href="${communityUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}" target="_blank" rel="noopener noreferrer">Community (opens in a new tab)</a></p>` : '';
  const status = failed ? 'Invitation not accepted. Sign in with the invited account and reopen the original link. Expired, revoked or used invitations need a new invitation from the owner.'
    : denied ? 'You need an owner-approved pilot place to use saved lessons. Sign-in alone does not grant access. Your previously saved work is retained.'
      : 'Open your invitation link to accept your free pilot place.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Academy invitation · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Your Academy place</h1><p id="invitation-status" role="status" aria-live="polite">${status}</p>
<p>This invitation gives one named learner free access to the two Verify results pilot lessons. It does not grant administrative rights or community membership.</p>
<p>Open the private invitation link you received, then sign in with the invited WitnessOps account through Keycloak. Creating an account does not give you a pilot place. If you already accepted your invitation, sign in to return to your lessons.</p>
<p>Need an account? <a href="/academy/account">Open your account page</a> for account creation, sign-in and help.</p>
<form id="invitation-form" method="post" action="/academy/auth/invitation" autocomplete="off">
<input type="hidden" id="invitation-token" name="token"><button class="btn" id="accept-invitation" type="${session ? 'button' : 'submit'}" disabled>${session ? 'Accept invitation' : 'Accept invitation and sign in'}</button></form>
<p><a id="sign-in" href="/academy/auth/login?lesson=${lesson.id}"${session ? ' hidden' : ''}>Sign in</a>
<button class="btn ghost" type="button" id="sign-out"${session ? '' : ' hidden'}>Sign out</button></p>
${community}<h2>Need help with access?</h2><p>You can ask for help without signing in. Tell support which step failed; choose what you share. An access request does not create a pilot place.</p>
${supportLinks()}<noscript>JavaScript is required to accept this private invitation. Use the support links above if you cannot use it.</noscript>
</main>${session ? `<script type="application/json" id="academy-csrf">${jsonText(session.csrf_token)}</script>` : ''}
<script type="module" src="/academy/static/invitation.js"></script></body></html>`;
}
