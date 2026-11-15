import { DEFAULT_LESSON } from './lesson-routes.mjs';
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

// Only fixed application text and an existing random CSRF token enter this page.
export function invitationPage(session, { denied = false, failed = false, lesson = DEFAULT_LESSON } = {}) {
  const status = failed ? 'Invitation not accepted. Sign in with the invited account and reopen the original link. Expired, revoked or used invitations need a new invitation from the owner.'
    : denied ? 'You need an owner-approved pilot place to use saved lessons. Sign-in alone does not grant access. Your previously saved work is retained.'
      : 'Open your invitation link to accept your free pilot place.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Academy invitation · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Your Academy place</h1><p id="invitation-status" role="status" aria-live="polite">${status}</p>
<p>This invitation gives one named learner free access to the two Verify results pilot lessons. It does not grant administrative rights or community membership.</p>
<form id="invitation-form" method="post" action="/academy/auth/invitation" autocomplete="off">
<input type="hidden" id="invitation-token" name="token"><button class="btn" id="accept-invitation" type="${session ? 'button' : 'submit'}" disabled>${session ? 'Accept invitation' : 'Accept invitation and sign in'}</button></form>
<p><a id="sign-in" href="/academy/auth/login?lesson=${lesson.id}"${session ? ' hidden' : ''}>Sign in</a>
<button class="btn ghost" type="button" id="sign-out"${session ? '' : ' hidden'}>Sign out</button></p>
<noscript>JavaScript is required to accept this private invitation. Contact the Academy owner if you cannot use it.</noscript>
</main>${session ? `<script type="application/json" id="academy-csrf">${jsonText(session.csrf_token)}</script>` : ''}
<script type="module" src="/academy/static/invitation.js"></script></body></html>`;
}
