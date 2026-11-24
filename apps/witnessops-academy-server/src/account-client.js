const logout = document.querySelector('#sign-out');
const status = document.querySelector('#account-status');
const actions = document.querySelector('#account-actions');
const csrf = JSON.parse(document.querySelector('#academy-csrf')?.textContent || '""');

logout.addEventListener('click', async () => {
  logout.disabled = true;
  status.textContent = 'Signing out…';
  try {
    const response = await fetch('/academy/auth/logout', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-CSRF-Token': csrf },
    });
    const body = await response.json();
    if (response.ok || response.status === 401) {
      location.replace('/academy/account');
      return;
    }
    if (response.status === 502 && ['pending', 'failed'].includes(body.idp_logout)) {
      actions.hidden = true;
      logout.hidden = true;
      document.querySelector('#academy-csrf').textContent = '""';
      document.querySelector('#signed-out-entry').hidden = false;
      status.textContent = 'Signed out of Academy. Identity sign-out is incomplete; your other WitnessOps sessions may still be active. Close this browser before leaving a shared device.';
      return;
    }
    throw new Error('logout');
  } catch {
    status.textContent = 'Sign-out could not be confirmed. Retry before leaving a shared device.';
    logout.disabled = false;
  }
});
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
