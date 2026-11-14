import { collectProgress, restoreProgress, clearPageState } from '/lesson.mjs';
import { parseProgress } from '/lesson-progress.mjs';

const API = '/academy/api/lessons/report-or-evidence/draft';
const form = document.querySelector('#lesson-form');
const status = document.querySelector('#progress-status');
const save = document.querySelector('#save-progress');
const logout = document.querySelector('#sign-out');
const login = document.querySelector('#sign-in');
const retry = document.querySelector('#retry-load');
const other = document.querySelector('#other-draft');
const savedText = document.querySelector('#saved-text');
const csrf = JSON.parse(document.querySelector('#academy-csrf')?.textContent || '""');
let signedIn = Boolean(csrf);
let ready = false;
let dirty = false;
let version = 0;
let pending = null;
let differentFormat = false;

function lock(locked) {
  document.querySelectorAll('#lesson-form input, #lesson-form textarea, #lesson-form button, #teacher-reply, #start-retry').forEach(el => { el.disabled = locked; });
  save.disabled = locked || (!dirty && !pending);
}
function ended(message) {
  ready = false;
  signedIn = false;
  dirty = false;
  pending = null;
  clearPageState();
  savedText.value = '';
  other.hidden = true;
  save.hidden = logout.hidden = retry.hidden = true;
  login.hidden = false;
  lock(true);
  status.textContent = message;
}
function changed() {
  if (!ready || differentFormat) return;
  dirty = true;
  save.disabled = false;
  status.textContent = pending ? 'The previous save is unconfirmed. Save work retries it first.' : 'Unsaved changes. Choose Save work to keep them.';
}
form.addEventListener('input', changed);
document.querySelector('#teacher-reply').addEventListener('input', changed);
window.addEventListener('academy-progress-changed', changed);
window.addEventListener('beforeunload', event => {
  if (dirty || pending) { event.preventDefault(); event.returnValue = ''; }
});
// Cached pages must revalidate the session before exposing an earlier learner's text.
window.addEventListener('pagehide', () => { clearPageState(); savedText.value = ''; lock(true); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

async function load() {
  ready = false;
  lock(true);
  retry.hidden = true;
  status.textContent = 'Loading your saved work…';
  try {
    const response = await fetch(API, { cache: 'no-store', credentials: 'same-origin' });
    if (response.status === 401) return ended('Your session ended. Sign in again to recover your saved work.');
    if (response.status === 404) {
      const body = await response.json();
      if (body.error !== 'no_draft') throw new Error('load');
      clearPageState();
      version = 0;
      status.textContent = 'No saved work yet. Start the lesson, then choose Save work.';
    } else {
      if (!response.ok) throw new Error('load');
      const body = await response.json();
      if (typeof body.content !== 'string' || !Number.isSafeInteger(body.version) || body.version < 1) throw new Error('load');
      version = body.version;
      const progress = parseProgress(body.content);
      differentFormat = !progress;
      if (progress) restoreProgress(progress);
      else { savedText.value = body.content; other.hidden = false; }
      status.textContent = `Your saved work is loaded (v${version}).`;
    }
    ready = true;
    dirty = false;
    lock(differentFormat);
  } catch {
    status.textContent = 'Your saved work could not be loaded. Retry loading before editing.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', load);
document.querySelector('#replace-draft').addEventListener('click', () => {
  if (!ready || !differentFormat || !confirm('Replace this saved text with the lesson form when you next save?')) return;
  differentFormat = false;
  other.hidden = true;
  lock(false);
  changed();
});
save.addEventListener('click', async () => {
  if (!ready || differentFormat) return;
  const current = JSON.stringify(collectProgress());
  const request = pending || { content: current, expected_version: version, save_request_id: crypto.randomUUID() };
  if (new TextEncoder().encode(request.content).length > 32768) {
    status.textContent = 'Not saved: this lesson exceeds the 32 KiB limit. Copy your work before reducing it.';
    return;
  }
  if (!parseProgress(request.content)) {
    status.textContent = 'Not saved: a lesson field is too long or invalid. Copy your work before correcting it.';
    return;
  }
  pending = request;
  lock(true);
  logout.disabled = true;
  status.textContent = 'Saving…';
  try {
    const response = await fetch(API, {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(request),
    });
    if (response.status === 401) return ended('Your session ended. Sign in again to recover your saved work.');
    if (response.status === 403) {
      ready = false;
      pending = null;
      status.textContent = 'Your session changed. Copy your unsaved work, then reload and sign in before saving.';
      return;
    }
    if (response.status === 409) {
      ready = false;
      pending = null;
      status.textContent = 'Saved elsewhere. Your edits are still here to copy. Reload to load the saved version before saving again.';
      return;
    }
    if (!response.ok) {
      if (response.status < 500) pending = null;
      throw new Error('save');
    }
    const body = await response.json();
    if (!Number.isSafeInteger(body.version) || body.version !== request.expected_version + 1) throw new Error('save');
    version = body.version;
    pending = null;
    dirty = current !== request.content;
    status.textContent = dirty ? `Earlier save confirmed (v${version}). Your newer edits still need saving.` : `Saved (v${version}). You can close this page and return.`;
  } catch {
    status.textContent = pending ? 'Save not confirmed. Your edits remain here. Choose Save work to retry the same save.' : 'Not saved. Your edits remain here. Try again or copy your work.';
  } finally {
    logout.disabled = false;
    // A conflict leaves edits available for copying, but saving stays blocked.
    if (signedIn) { lock(false); save.disabled = !ready || (!dirty && !pending); }
  }
});
logout.addEventListener('click', async () => {
  if ((dirty || pending) && !confirm('Sign out and discard unsaved changes? Saved work stays in your account.')) return;
  lock(true);
  logout.disabled = true;
  try {
    const response = await fetch('/academy/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
    const body = await response.json();
    if (response.ok || response.status === 401 || (response.status === 502 && body.idp_logout === 'pending')) {
      ended(body.idp_logout === 'pending' ? 'Signed out of Academy. Sign-out at the login service is pending; close this browser on a shared device.' : 'Signed out. Sign in again to recover your saved work.');
    } else throw new Error('logout');
  } catch {
    status.textContent = 'Sign-out could not be confirmed. Retry Sign out before leaving a shared device.';
    lock(!ready || differentFormat);
  } finally { logout.disabled = false; }
});
lock(true);
if (signedIn) await load();
