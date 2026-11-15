const form = document.querySelector('#invitation-form');
const accept = document.querySelector('#accept-invitation');
const status = document.querySelector('#invitation-status');
const logout = document.querySelector('#sign-out');
const csrf = JSON.parse(document.querySelector('#academy-csrf')?.textContent || '""');
const fragment = new URLSearchParams(location.hash.slice(1));
let token = fragment.size === 1 && /^[A-Za-z0-9_-]{43}$/.test(fragment.get('token') || '') ? fragment.get('token') : '';
// Invitation tokens never go into query strings, browser storage or diagnostic output.
history.replaceState(null, '', location.pathname);
let active = true;
const rejected = 'Invitation not accepted. Check the invited account, or ask the owner for a new invitation.';
const post = (action, body) => fetch(`/academy/api/invitations/${action}`, {
  method: 'POST', credentials: 'same-origin', cache: 'no-store',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body),
});
if (token && !csrf) {
  document.querySelector('#invitation-token').value = token;
  accept.disabled = false;
  status.textContent = 'Sign in with the account named in your invitation to accept your free pilot place.';
} else if (token && csrf) {
  status.textContent = 'Checking your invitation…';
  try {
    const response = await post('preview', { token });
    if (!response.ok || !(await response.json()).eligible) throw new Error('invalid');
    if (active) {
      status.textContent = 'This account can accept the free pilot invitation.';
      accept.disabled = false;
    }
  } catch { if (active) status.textContent = rejected; }
}
form.addEventListener('submit', event => {
  if (csrf || !token) event.preventDefault();
  else accept.disabled = true;
});
accept.addEventListener('click', async () => {
  if (!csrf || !token || accept.disabled) return;
  accept.disabled = true;
  status.textContent = 'Accepting your invitation…';
  try {
    const response = await post('redeem', { token });
    if (!response.ok || !(await response.json()).accepted) throw new Error('invalid');
    token = '';
    if (active) location.replace('/academy/learn/report-or-evidence');
  } catch {
    if (!active) return;
    status.textContent = `${rejected} If the response was lost after acceptance, sign in and open the lesson; your grant is saved.`;
  }
});
logout.addEventListener('click', async () => {
  logout.disabled = true;
  accept.disabled = true;
  token = '';
  document.querySelector('#invitation-token').value = '';
  try {
    const response = await fetch('/academy/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
    const body = await response.json();
    if (!response.ok && response.status !== 401 && !(response.status === 502 && ['pending', 'failed'].includes(body.idp_logout))) throw new Error('logout');
    location.replace('/academy/invitation');
  } catch { status.textContent = 'Sign-out could not be confirmed. Retry before leaving a shared device.'; logout.disabled = false; }
});
window.addEventListener('pagehide', () => { active = false; token = ''; accept.disabled = true; document.querySelector('#invitation-token').value = ''; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
