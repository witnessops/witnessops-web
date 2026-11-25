'use strict';
// This script provides Teams host initialization only. It receives no tokens or learner data.
(async () => {
  const status = document.getElementById('teams-status');
  if (!status) return;
  try {
    if (typeof window.microsoftTeams?.app?.initialize !== 'function') throw new Error('teams_sdk_unavailable');
    await window.microsoftTeams.app.initialize();
    status.textContent = 'Teams launch screen ready. Choose a case to open Academy.';
  } catch {
    status.textContent = 'Choose a case to open Academy in your browser.';
  }
})();
