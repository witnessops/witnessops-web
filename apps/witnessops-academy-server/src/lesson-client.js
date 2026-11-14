const raw = document.getElementById('academy-csrf')?.textContent || '""';
const CSRF = JSON.parse(raw);
let version = 0;
let ready = false;
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
  try {
    const d = JSON.parse(c);
    d.claims.forEach((x, i) => {
      if (x.label) f[`l${i}`].value = x.label;
      f[`r${i}`].value = x.reason || '';
    });
    f.limit.value = d.limit || '';
  } catch { /* stored text is not this form's shape */ }
};
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
  const r = await fetch('/academy/api/lessons/report-or-evidence/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ content: collect(), expected_version: version, save_request_id: crypto.randomUUID() }),
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
