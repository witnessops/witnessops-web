const form = document.getElementById('teams-link-form');
const confirmLink = document.getElementById('confirm-teams-link');
const tokenInput = document.getElementById('teams-link-token');
const unlink = document.getElementById('unlink-teams-account');
const status = document.getElementById('teams-link-page-status');
const csrf = JSON.parse(document.getElementById('academy-csrf')?.textContent || '""');
const fragment = new URLSearchParams(location.hash.slice(1));
let token = fragment.size === 1 && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(fragment.get('token') || '')
  ? fragment.get('token') : '';
// The one-time token remains only in memory (and briefly in the native form field).
history.replaceState(null, '', location.pathname);
let active = true;

const post = (path, body) => fetch(path, {
  method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
  headers: {
    Accept: 'application/json',
    'X-CSRF-Token': csrf,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

if (form && confirmLink && tokenInput) {
  if (token && !csrf) {
    tokenInput.value = token;
    confirmLink.disabled = false;
    status.textContent = 'Continue to sign in with the existing Academy account you want to link.';
  } else if (token && csrf) {
    confirmLink.disabled = false;
    status.textContent = 'Confirm that you want to link this Teams identity to the signed-in Academy account.';
  } else {
    status.textContent = 'This account-link request is missing or invalid. Return to the private Teams tab and start again.';
  }

  form.addEventListener('submit', event => {
    if (csrf || !token) event.preventDefault();
    else confirmLink.disabled = true;
  });

  confirmLink.addEventListener('click', async () => {
    if (!csrf || !token || confirmLink.disabled) return;
    confirmLink.disabled = true;
    status.textContent = 'Linking Microsoft Teams to this Academy account…';
    try {
      const response = await post('/academy/api/teams/link-confirm', { token });
      const body = await response.json();
      if (!response.ok || body?.linked !== true) throw new Error('link_failed');
      token = '';
      tokenInput.value = '';
      form.hidden = true;
      if (active) status.textContent = 'Microsoft Teams is linked. Your existing Academy account and saved work remain unchanged.';
    } catch {
      if (active) {
        status.textContent = 'The account link could not be confirmed. Return to Teams for a new private link, then retry.';
        confirmLink.disabled = false;
      }
    }
  });
}

if (unlink) {
  unlink.addEventListener('click', async () => {
    if (!csrf || unlink.disabled) return;
    unlink.disabled = true;
    status.textContent = 'Unlinking Microsoft Teams…';
    try {
      const response = await post('/academy/api/teams/unlink');
      const body = await response.json();
      if (!response.ok || body?.unlinked !== true) throw new Error('unlink_failed');
      unlink.hidden = true;
      if (active) status.textContent = 'Microsoft Teams is unlinked. Your Academy account, access and saved work are unchanged.';
    } catch {
      if (active) {
        status.textContent = 'Microsoft Teams could not be unlinked. Retry before leaving this page.';
        unlink.disabled = false;
      }
    }
  });
}

window.addEventListener('pagehide', () => {
  active = false;
  token = '';
  if (tokenInput) tokenInput.value = '';
  if (confirmLink) confirmLink.disabled = true;
});
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
