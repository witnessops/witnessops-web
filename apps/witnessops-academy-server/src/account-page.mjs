import { supportLinks } from './invitation-page.mjs';

export const ACCOUNT_ROUTE = '/academy/account';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const jsonText = value => JSON.stringify(value).replaceAll('<', String.fromCharCode(92) + 'u003c');

// The operator enables this only after the identity provider's verification and
// recovery mail have been accepted. Unknown values must not open registration.
export function registrationEnabled(value = 'false') {
  if (!['true', 'false'].includes(value)) throw new Error('Invalid Academy self-service registration setting');
  return value === 'true';
}

// No name, email, subject, invitation bearer or lesson draft enters this shell.
export function accountPage(session, { registration = false, admitted = false, communityUrl = null } = {}) {
  const signIn = '/academy/auth/login?return=account';
  const entry = session
    ? '<p>Your WitnessOps account is ready. Choose where you want to go next.</p>'
    : `<p>${registration ? 'Create a WitnessOps account or sign in to continue.' : 'Sign in with your WitnessOps account to continue.'}</p>
${registration ? '<p><a class="btn" id="create-account" href="/academy/auth/register">Create account</a></p><p>Verify your email to finish creating your account.</p>' : '<p id="registration-status">Account creation is not open yet. You can sign in with an existing WitnessOps account or ask for help below.</p>'}
<p><a class="btn ghost" id="sign-in" href="${signIn}">Sign in</a></p>`;
  const community = session && communityUrl
    ? `<section><h2>Community</h2><p>Use your WitnessOps account to sign in to Community. Private rooms have their own access rules.</p><p><a class="btn" id="community-link" href="${escape(communityUrl)}" target="_blank" rel="noopener noreferrer">Open Community (opens in a new tab)</a></p></section>` : '';
  const lessons = session && admitted
    ? '<p id="lesson-access">Your pilot place is active. Open a lesson to continue your saved work.</p><p><a class="btn" href="/academy/learn/report-or-evidence">Report or evidence?</a> <a class="btn ghost" href="/academy/learn/same-scope">Same record, wrong scope?</a></p>'
    : '<p id="lesson-access">The saved pilot lessons need an owner-approved place. Creating an account does not enrol you in the pilot. If you received a private invitation, open its original link to accept it with the invited account.</p><p><a href="/academy/invitation">Invitation help</a></p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your account · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Your WitnessOps account</h1><p id="account-status" role="status" aria-live="polite"></p>
<div id="account-actions">${entry}${community}<section><h2>Academy lessons</h2>${lessons}
<p>You can explore <a href="/lessons/reported-versus-saved/">Prepared Lesson 1</a> and the <a href="/workbook/">workbook</a> without an account. These previews do not save your work.</p></section></div>
${session ? `<p><button class="btn ghost" type="button" id="sign-out">Sign out</button></p><p id="signed-out-entry" hidden><a href="${signIn}">Sign in again</a></p>` : ''}
<section><h2>Need help?</h2><p>Tell support which step you need help with. Choose what you share; never send passwords, verification links or recovery codes.</p>${supportLinks()}</section>
</main>${session ? `<script type="application/json" id="academy-csrf">${jsonText(session.csrf_token)}</script><script type="module" src="/academy/static/account.js"></script>` : ''}</body></html>`;
}
