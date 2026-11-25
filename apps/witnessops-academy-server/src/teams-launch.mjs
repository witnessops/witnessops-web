// Public, non-authenticated Microsoft Teams entry page only.
// No cookies or learner data are read. Saved cases remain served by Academy's protected routes.
export const TEAMS_LAUNCH_ROUTE = '/academy/teams/launch';
export const TEAMS_JS_ROUTE = '/academy/static/teams-launch.js';
export const TEAMS_CSS_ROUTE = '/academy/static/teams-launch.css';

const ALLOWED_FRAME_ANCESTORS = 'https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft';

export function teamsLaunchHeaders({ secure = true } = {}) {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    // No X-Frame-Options here; this *public-only* route is the sole iframe exception.
    'Content-Security-Policy': "default-src 'none'; script-src 'self' https://res.cdn.office.net; style-src 'self'; img-src 'none'; connect-src 'none'; frame-ancestors " + ALLOWED_FRAME_ANCESTORS + "; base-uri 'none'; form-action 'none'; object-src 'none'",
    ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  };
}

export function teamsLaunchPage() {
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
  <p class="footnote">This is a public launch screen, not a Teams login or progress editor. Only Academy controls case access, decisions and assessment.</p>
</main>
</body>
</html>`;
}
