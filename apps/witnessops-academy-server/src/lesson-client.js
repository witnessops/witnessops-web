import { contentToSave, isBrowserDraft } from '/academy/static/draft-text.mjs';

const raw = document.getElementById('academy-csrf')?.textContent || '""';
const CSRF = JSON.parse(raw);
let version = 0;
let ready = false;
let stored = '';
let edited = false;
const f = document.getElementById('f');
const st = document.getElementById('st');
const fields = () => f.querySelectorAll('input,textarea,button');
fields().forEach((el) => { el.disabled = true; });
const unlock = () => {
  ready = true;
  fields().forEach((el) => { el.disabled = false; });
};
const collect = () => JSON.stringify({
  claims: [0, 1, 2].map((i) => ({ label: (f[`l${i}`].value || null), reason: f[`r${i}`].value })),
  limit: f.limit.value,
});
const apply = (c) => {
  stored = c;
  if (!isBrowserDraft(c)) return;
  const d = JSON.parse(c);
  d.claims.forEach((x, i) => {
    if (typeof x.label === 'string' && x.label) f[`l${i}`].value = x.label;
    f[`r${i}`].value = typeof x.reason === 'string' ? x.reason : '';
  });
  f.limit.value = d.limit;
};
f.addEventListener('input', () => { edited = true; });
f.addEventListener('change', () => { edited = true; });
fetch('/academy/api/lessons/report-or-evidence/draft').then(async (r) => {
  if (r.ok) {
    const d = await r.json();
    version = d.version;
    apply(d.content);
    st.textContent = `Draft loaded (v${version})`;
    unlock();
  } else if (r.status === 404) unlock();
  else st.textContent = 'Draft not loaded';
}).catch(() => { st.textContent = 'Draft not loaded'; });
f.onsubmit = async (e) => {
  e.preventDefault();
  if (!ready) return;
  const content = contentToSave(stored, collect(), edited);
  if (content == null || content === '') {
    st.textContent = 'Nothing to save';
    return;
  }
  const r = await fetch('/academy/api/lessons/report-or-evidence/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ content, expected_version: version, save_request_id: crypto.randomUUID() }),
  });
  const d = await r.json();
  if (r.ok) {
    version = d.version;
    st.textContent = `Saved (v${version})`;
  } else if (r.status === 409) st.textContent = `Saved elsewhere (v${d.current_version}). Reload before saving.`;
  else st.textContent = `Not saved: ${d.error}`;
};
document.getElementById('lo').onclick = async () => {
  const r = await fetch('/academy/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': CSRF } });
  const d = await r.json();
  if (!r.ok) st.textContent = `Sign-out did not finish at the login service (${d.idp_logout_status}).`;
  location.href = '/academy/learn/report-or-evidence';
};
