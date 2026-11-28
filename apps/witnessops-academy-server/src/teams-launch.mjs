// Public Microsoft Teams entry page. Even when the private account-link bridge is enabled,
// this iframe reads no Academy cookie or learner data. Saved cases stay on protected routes.
export const TEAMS_LAUNCH_ROUTE = '/academy/teams/launch';
export const TEAMS_JS_ROUTE = '/academy/static/teams-launch.js';
export const TEAMS_CSS_ROUTE = '/academy/static/teams-launch.css';

const ALLOWED_FRAME_ANCESTORS = 'https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft';

export function teamsLaunchHeaders({ secure = true, bridgeEnabled = false } = {}) {
  const connectSource = bridgeEnabled === true ? "'self'" : "'none'";
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    // No X-Frame-Options here; this public shell is the sole iframe exception.
    'Content-Security-Policy': "default-src 'none'; script-src 'self' https://res.cdn.office.net; style-src 'self'; img-src 'none'; connect-src " + connectSource + '; frame-ancestors ' + ALLOWED_FRAME_ANCESTORS + "; base-uri 'none'; form-action 'none'; object-src 'none'",
    ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  };
}

export function teamsLaunchPage({ bridgeEnabled = false } = {}) {
  const linkPanel = bridgeEnabled === true ? `<section aria-labelledby="account-link-heading">
    <article><h2 id="account-link-heading">Use your existing Academy account</h2>
    <p>Link this private Teams identity to your existing WitnessOps account. Linking does not grant lesson access or move, copy or reset your saved work.</p>
    <button id="link-teams-account" type="button" disabled>Link my Academy account</button>
    <p id="teams-link-status" role="status" aria-live="polite">Teams must be ready before account linking can start.</p></article>
  </section>` : '';
  const footnote = bridgeEnabled === true
    ? 'Teams only starts a short-lived account-link request. Academy still controls sign-in, lesson access, decisions and assessment.'
    : 'This is a public launch screen, not a Teams login or progress editor. Only Academy controls case access, decisions and assessment.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Academy Decision Room — Microsoft Teams</title>
<link rel="stylesheet" href="/academy/static/teams-launch.css">
<script defer src="https://res.cdn.office.net/teams-js/2.19.0/js/MicrosoftTeams.min.js"></script>
<script defer src="/academy/static/teams-launch.js"></script>
</head>
<body>
<main>
  <p class="eyebrow">WITNESSOPS ACADEMY · TEAMS PREVIEW</p>
  <h1>Decision Room</h1>
  <p id="teams-status" role="status">Loading the private Teams launch screen…</p>
  <p>Choose a scenario. The investigation opens in Academy, where your account and saved work stay private.</p>
  <section aria-label="Cases">
    <article><h2>Report or evidence?</h2><p>An agent claims the job is finished. What evidence actually proves it?</p><a href="https://academy.witnessops.com/academy/learn/report-or-evidence" target="_blank" rel="noopener noreferrer">Open investigation</a></article>
    <article><h2>Same record, wrong scope?</h2><p>The evidence is convincing. Is it evidence for the right claim?</p><a href="https://academy.witnessops.com/academy/learn/same-scope" target="_blank" rel="noopener noreferrer">Open investigation</a></article>
  </section>
  ${linkPanel}
  <p class="footnote">${footnote}</p>
</main>
</body>
</html>`;
}
