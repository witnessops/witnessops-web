import { isCanonicalTeamsLinkToken } from './preauth-cookie.mjs';

export const TEAMS_LINK_ROUTE = '/academy/teams/link';
export const TEAMS_LINK_JS_ROUTE = '/academy/static/teams-link.js';
export const TEAMS_LINK_PAGE_HEADERS = Object.freeze({ 'Referrer-Policy': 'no-referrer' });

const jsonText = value => JSON.stringify(value).replaceAll('<', String.fromCharCode(92) + 'u003c');

export function teamsLinkInput(body) {
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).length === 1 && isCanonicalTeamsLinkToken(body.token) ? body.token : null;
}

// No Entra claims, Academy identity fields or one-time token enter this shell.
export function teamsLinkPage(session, { linked = false, enabled = false } = {}) {
  if (enabled !== true) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teams account link · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Teams account link</h1><p role="status">Private Teams account linking is not enabled.</p><p><a href="/academy/account">Open your Academy account</a></p>
</main></body></html>`;
  }

  const isLinked = Boolean(session && linked);
  const status = isLinked
    ? 'This Academy account is linked to the private Microsoft Teams app.'
    : session
      ? 'Open the private account-link window from Teams, then confirm the link here.'
      : 'Open the private account-link window from Teams, then sign in with the existing Academy account you want to keep using.';
  const action = isLinked
    ? '<p><button class="btn ghost" id="unlink-teams-account" type="button">Unlink Microsoft Teams</button></p>'
    : `<form id="teams-link-form" method="post" action="/academy/auth/teams-link" autocomplete="off">
<input type="hidden" id="teams-link-token" name="token"><button class="btn" id="confirm-teams-link" type="${session ? 'button' : 'submit'}" disabled>${session ? 'Link this Teams identity' : 'Continue to sign in and link'}</button></form>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teams account link · WitnessOps Academy</title><link rel="stylesheet" href="/chron.css"><link rel="stylesheet" href="/academy.css"></head>
<body><header class="site"><a href="/">WitnessOps Academy</a></header><main class="col" id="main-content">
<h1>Link Microsoft Teams to Academy</h1><p id="teams-link-page-status" role="status" aria-live="polite">${status}</p>
<p>The link connects one verified Teams identity to this existing Academy account. It does not grant pilot access, create another learner record, or move, copy or reset saved work.</p>
${action}<p><a href="/academy/account">Open your Academy account</a></p>
<noscript>JavaScript is required to use the short-lived private link. Return to Teams and retry in a browser with JavaScript enabled.</noscript>
</main>${session ? `<script type="application/json" id="academy-csrf">${jsonText(session.csrf_token)}</script>` : ''}
<script type="module" src="${TEAMS_LINK_JS_ROUTE}"></script></body></html>`;
}
