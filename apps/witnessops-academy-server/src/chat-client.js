const main = document.querySelector('[data-chat-api]');
const lessonId = main?.dataset.lessonId;
const API = main?.dataset.chatApi;
const lessonIds = ['report-or-evidence', 'same-scope'];
if (!lessonIds.includes(lessonId) || API !== `/academy/api/lessons/${lessonId}/chat`) throw new Error('Unsupported lesson');

const byId = id => document.getElementById(id);
const status = byId('chat-status');
const welcome = byId('lesson-welcome');
const conversation = byId('conversation');
const decision = byId('decision-panel');
const choices = byId('decision-choices');
const submit = byId('submit-decision');
const start = byId('start-lesson');
const retry = byId('retry-request');
const reload = byId('reload-attempt');
const complete = byId('lesson-complete');
let csrf = '';
try { csrf = JSON.parse(byId('academy-csrf')?.textContent || '""'); } catch { /* Missing session data cannot enable writes. */ }
if (typeof csrf !== 'string') csrf = '';
let signedIn = Boolean(csrf);
let ready = false;
let busy = false;
let attempt = null;
let selected = null;
let pending = null;
let generation = 0;
let renderedMessages = [];

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function setBusy(value) {
  busy = value;
  main.setAttribute('aria-busy', String(value));
  start.disabled = value || !ready || Boolean(pending);
  submit.disabled = value || !ready || !selected || Boolean(pending);
  retry.disabled = reload.disabled = value;
  choices.querySelectorAll('input').forEach(input => { input.disabled = value || !ready || Boolean(pending); });
}

function clearConversation() {
  attempt = null;
  selected = null;
  renderedMessages = [];
  conversation.replaceChildren();
  choices.replaceChildren();
  byId('final-record').replaceChildren();
  byId('decision-prompt').textContent = '';
  conversation.hidden = decision.hidden = complete.hidden = true;
  byId('next-lesson').hidden = true;
  byId('lesson-progress').value = 0;
  byId('step-label').textContent = '3 decisions';
}

function ended(message, allowSignIn = true) {
  generation += 1;
  signedIn = ready = false;
  pending = null;
  csrf = '';
  clearConversation();
  welcome.hidden = false;
  start.hidden = retry.hidden = reload.hidden = true;
  byId('sign-in').hidden = !allowSignIn;
  byId('return-account').hidden = allowSignIn;
  status.textContent = message;
  setBusy(false);
}

function validProjection(value) {
  if (!value || typeof value !== 'object' || value.lesson_id !== lessonId
      || typeof value.attempt_id !== 'string' || !value.attempt_id
      || !Number.isSafeInteger(value.version) || value.version < 1
      || typeof value.stage !== 'string' || typeof value.status !== 'string'
      || typeof value.prompt !== 'string' || !Array.isArray(value.messages) || value.messages.length > 100
      || !Array.isArray(value.choices) || value.choices.length > 12
      || !Number.isSafeInteger(value.progress?.current) || !Number.isSafeInteger(value.progress?.total)
      || value.progress.total < 1 || value.progress.current < 1 || value.progress.current > value.progress.total) return false;
  const validRecord = rows => rows === undefined || (Array.isArray(rows) && rows.length <= 20
    && rows.every(row => typeof row.claim === 'string' && typeof row.status === 'string'));
  if (!validRecord(value.decision_record)) return false;
  if (!value.messages.every(message => message && ['academy', 'learner'].includes(message.role)
      && typeof message.text === 'string' && (message.heading === undefined || typeof message.heading === 'string')
      && validRecord(message.record)
      && (message.evidence === undefined || (Array.isArray(message.evidence) && message.evidence.length <= 10
        && message.evidence.every(record => typeof record.name === 'string' && typeof record.content === 'string'
          && (record.language === undefined || typeof record.language === 'string')))))) return false;
  return value.choices.every(choice => choice && typeof choice.id === 'string' && typeof choice.label === 'string')
    && new Set(value.choices.map(choice => choice.id)).size === value.choices.length;
}

function recordTable(rows) {
  const table = node('table', 'record-table');
  const head = node('thead');
  const heading = node('tr');
  for (const label of ['Claim', 'Evidence status']) {
    const cell = node('th', '', label);
    cell.scope = 'col';
    heading.append(cell);
  }
  head.append(heading);
  const body = node('tbody');
  for (const item of rows) {
    const row = node('tr');
    row.append(node('td', '', item.claim));
    const cell = node('td');
    const normalized = item.status.toUpperCase().replaceAll(' ', '_');
    const tone = ['SUPPORTED', 'VERIFIED', 'ACCEPTED', 'ESTABLISHED'].includes(normalized) ? ' supported'
      : ['BLOCKED', 'FAILED', 'CONTRADICTED'].includes(normalized) ? ' blocked' : '';
    cell.append(node('span', `record-status${tone}`, item.status));
    row.append(cell);
    body.append(row);
  }
  table.append(head, body);
  return table;
}

function messageNode(message) {
  const article = node('article', `chat-message ${message.role === 'learner' ? 'learner-message' : 'academy-message'}`);
  const header = node('div', 'message-header');
  if (message.role === 'academy') {
    const mark = node('span', 'message-mark', 'W');
    mark.setAttribute('aria-hidden', 'true');
    header.append(mark);
  }
  header.append(node('span', '', message.role === 'learner' ? 'You' : 'WitnessOps Academy'));
  const content = node('div', 'message-content');
  if (message.heading) content.append(node('h3', '', message.heading));
  if (message.text) content.append(node('p', 'message-text', message.text));
  for (const evidence of message.evidence || []) {
    const figure = node('figure', 'evidence-card');
    const caption = node('figcaption', 'evidence-caption');
    caption.append(node('span', '', evidence.name));
    if (evidence.language) caption.append(node('span', 'evidence-kind', evidence.language));
    const pre = node('pre');
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', evidence.name);
    pre.append(node('code', '', evidence.content));
    figure.append(caption, pre);
    content.append(figure);
  }
  if (message.record?.length) content.append(recordTable(message.record));
  article.append(header, content);
  return article;
}

function render(value, focus = false) {
  attempt = value;
  selected = null;
  welcome.hidden = true;
  conversation.hidden = false;
  const serial = value.messages.map(message => JSON.stringify(message));
  const isExtension = renderedMessages.length <= serial.length && renderedMessages.every((item, index) => item === serial[index]);
  if (!isExtension) {
    conversation.replaceChildren();
    renderedMessages = [];
  }
  for (const message of value.messages.slice(renderedMessages.length)) conversation.append(messageNode(message));
  renderedMessages = serial;
  const progress = byId('lesson-progress');
  progress.max = value.progress.total;
  progress.value = value.progress.current;
  progress.textContent = `${value.progress.current} of ${value.progress.total} decisions`;
  byId('step-label').textContent = value.status === 'completed' ? 'Complete'
    : `Decision ${value.progress.current} of ${value.progress.total}`;
  choices.replaceChildren(node('legend', 'visually-hidden', 'Choose your judgment'));
  byId('decision-prompt').textContent = value.prompt;
  for (const [index, choice] of value.choices.entries()) {
    const label = node('label', 'choice-label');
    const input = node('input');
    input.type = 'radio';
    input.name = 'decision';
    input.value = choice.id;
    input.id = `choice-${index}`;
    input.addEventListener('change', () => {
      if (busy || !ready || pending) return;
      selected = choice.id;
      status.textContent = 'Choice selected. Submit your judgment to save it.';
      setBusy(false);
    });
    label.append(input, node('span', '', choice.label));
    choices.append(label);
  }
  const finished = value.status === 'completed';
  decision.hidden = finished || value.choices.length === 0;
  complete.hidden = !finished;
  byId('final-record').replaceChildren();
  const recordAlreadyShown = JSON.stringify(value.messages.at(-1)?.record) === JSON.stringify(value.decision_record);
  if (finished && value.decision_record?.length && !recordAlreadyShown) byId('final-record').append(recordTable(value.decision_record));
  const next = byId('next-lesson');
  next.hidden = true;
  if (finished && lessonIds.includes(value.next_lesson_id) && value.next_lesson_id !== lessonId) {
    next.href = `/academy/learn/${value.next_lesson_id}`;
    next.replaceChildren(document.createTextNode(value.next_lesson_id === 'same-scope' ? 'Continue to Lesson 2 ' : 'Continue to Lesson 1 '), node('span', '', '→'));
    next.hidden = false;
  }
  if (focus) {
    const target = finished ? byId('complete-title') : !decision.hidden ? byId('decision-prompt') : conversation.lastElementChild;
    if (target) requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, json: async () => JSON.parse(text) };
  } finally { clearTimeout(timer); }
}

async function load() {
  if (!signedIn || busy) return;
  const current = ++generation;
  ready = false;
  setBusy(true);
  retry.hidden = reload.hidden = true;
  status.textContent = 'Loading your lesson…';
  try {
    const response = await request(API);
    if (!signedIn || current !== generation) return;
    if (response.status === 401) return ended('Your session ended. Sign in to return to your saved lesson.');
    if (response.status === 403) return ended('Your Academy access needs checking. Your saved work is retained.', false);
    const value = await response.json();
    if (!signedIn || current !== generation) return;
    if (response.status === 404 && value.error === 'no_attempt') {
      clearConversation();
      welcome.hidden = false;
      start.hidden = false;
      pending = null;
      ready = true;
      status.textContent = 'Ready when you are. Start to receive your case.';
      return;
    }
    if (!response.ok || !validProjection(value)) throw new Error('load');
    pending = null;
    ready = true;
    render(value);
    status.textContent = value.status === 'completed' ? 'Your completed exercise is saved to your Academy account.'
      : value.status === 'review_required' ? 'Your attempt is saved. Review the feedback before continuing your learning.'
        : 'Your saved lesson is ready. Continue with the next decision.';
  } catch {
    if (!signedIn || current !== generation) return;
    status.textContent = 'Your saved lesson could not be loaded. Try again before making a decision.';
    reload.hidden = false;
    retry.hidden = !pending;
  } finally {
    if (signedIn && current === generation) setBusy(false);
  }
}

async function write() {
  if (!signedIn || busy || !pending) return;
  const current = generation;
  const operation = pending;
  setBusy(true);
  retry.hidden = reload.hidden = true;
  status.textContent = operation.payload.action === 'start' ? 'Preparing your case…' : 'Saving your decision…';
  try {
    const response = await request(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: operation.body,
    });
    if (!signedIn || current !== generation) return;
    if (response.status === 401) return ended('Your session ended. Sign in to check your saved lesson before continuing.');
    if (response.status === 403) return ended('Your session or Academy access changed. Return to your account before continuing.', false);
    if (response.status === 409) {
      pending = null;
      ready = false;
      selected = null;
      status.textContent = 'This lesson changed in another window. Load the saved lesson before making another decision.';
      reload.hidden = false;
      return;
    }
    if (!response.ok) {
      if (response.status < 500) {
        pending = null;
        ready = false;
        status.textContent = 'That decision was not accepted. Load your saved lesson before continuing.';
        reload.hidden = false;
        return;
      }
      throw new Error('save');
    }
    const value = await response.json();
    if (!signedIn || current !== generation) return;
    const returnedVersion = operation.payload.expected_version + 1;
    const exactVersion = value?.version === returnedVersion;
    const advancedReplay = value?.replay === true && value.version > returnedVersion;
    if (!validProjection(value)
        || (operation.payload.action === 'submit' && (value.attempt_id !== operation.payload.attempt_id
          || (!exactVersion && !advancedReplay)))) throw new Error('save');
    pending = null;
    ready = true;
    render(value, true);
    status.textContent = value.status === 'completed' ? 'Exercise complete. Your decision record is saved.'
      : value.status === 'review_required' ? 'Your attempt is saved. Review the feedback before continuing your learning.'
        : 'Saved to your Academy account. You can leave and return.';
  } catch {
    if (!signedIn || current !== generation) return;
    status.textContent = 'Saving is not confirmed. Retry the same decision, or load your saved lesson to check what was recorded.';
    retry.hidden = false;
    reload.hidden = false;
  } finally {
    if (signedIn && current === generation) setBusy(false);
  }
}

function queue(payload) {
  pending = { payload, body: JSON.stringify(payload) };
  return write();
}

start.addEventListener('click', () => {
  if (!ready || busy || pending || attempt) return;
  queue({ action: 'start', request_id: crypto.randomUUID() });
});
byId('decision-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!ready || busy || pending || !attempt || !selected) return;
  queue({ action: 'submit', attempt_id: attempt.attempt_id, expected_version: attempt.version,
    request_id: crypto.randomUUID(), stage: attempt.stage, choice_id: selected });
});
retry.addEventListener('click', write);
reload.addEventListener('click', load);
window.addEventListener('beforeunload', event => {
  if (pending || selected) { event.preventDefault(); event.returnValue = ''; }
});
// A cached page cannot continue exposing a previous learner's case without revalidation.
window.addEventListener('pagehide', () => {
  ended('Reopen the lesson to check your session.');
  if (byId('academy-csrf')) byId('academy-csrf').textContent = '""';
});
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

setBusy(false);
if (signedIn) await load();
