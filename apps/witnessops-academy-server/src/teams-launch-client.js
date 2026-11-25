'use strict';
// The access token is requested only after an explicit click, sent once to the same-origin
// link-intent endpoint, and never stored or written into the page or diagnostics.
(async () => {
  const status = document.getElementById('teams-status');
  const linkButton = document.getElementById('link-teams-account');
  const linkStatus = document.getElementById('teams-link-status');
  if (!status) return;
  let active = true;
  window.addEventListener('pagehide', () => { active = false; if (linkButton) linkButton.disabled = true; });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  try {
    if (typeof window.microsoftTeams?.app?.initialize !== 'function') throw new Error('teams_sdk_unavailable');
    await window.microsoftTeams.app.initialize();
    status.textContent = 'Teams launch screen ready. Choose a case to open Academy.';
    if (linkButton && linkStatus) {
      if (typeof window.microsoftTeams?.authentication?.getAuthToken !== 'function') throw new Error('teams_sso_unavailable');
      linkButton.disabled = false;
      linkStatus.textContent = 'Ready to link this Teams identity to your existing Academy account.';
      linkButton.addEventListener('click', async () => {
        if (!active || linkButton.disabled) return;
        linkButton.disabled = true;
        linkStatus.textContent = 'Starting the private account-link request…';
        let accessToken = '';
        try {
          accessToken = await window.microsoftTeams.authentication.getAuthToken();
          if (typeof accessToken !== 'string' || accessToken.length < 16 || accessToken.length > 16_384) throw new Error('invalid_access_token');
          const response = await fetch('/academy/api/teams/link-intents', {
            method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
            headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
          });
          accessToken = '';
          const body = await response.json();
          const linkToken = body && typeof body === 'object' && !Array.isArray(body)
            && Object.keys(body).length === 1 && typeof body.token === 'string'
            && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(body.token) ? body.token : '';
          if (!response.ok || !linkToken) throw new Error('link_intent_failed');
          const destination = new URL('/academy/teams/link', location.origin);
          destination.hash = new URLSearchParams({ token: linkToken }).toString();
          if (typeof window.microsoftTeams.app.openLink === 'function') {
            await window.microsoftTeams.app.openLink(destination.href);
          } else {
            const opened = window.open(destination.href, '_blank', 'noopener,noreferrer');
            if (!opened) throw new Error('link_window_blocked');
          }
          if (active) linkStatus.textContent = 'Continue in the Academy window that just opened.';
        } catch {
          accessToken = '';
          if (active) {
            linkStatus.textContent = 'Account linking could not start. Retry from this private Teams tab.';
            linkButton.disabled = false;
          }
        }
      });
    }
  } catch {
    status.textContent = 'Choose a case to open Academy in your browser.';
    if (linkStatus) linkStatus.textContent = 'Account linking is available only inside the private Microsoft Teams app.';
  }
})();
