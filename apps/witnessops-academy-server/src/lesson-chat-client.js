const LESSON_ID = 'report-or-evidence';
const API = '/academy/api/lessons/report-or-evidence/chat';
const steps = new Set(['judgment', 'verification', 'closure', 'complete']);
const text = (value, maximum) => typeof value === 'string' && value.length <= maximum;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[a-z0-9_-]{1,80}$/.test(value);

/** A failed or malformed response must never be presented as a confirmed save. */
export function isLessonProjection(value) {
  return record(value) && value.lesson_id === LESSON_ID && identifier(value.revision)
    && text(value.title, 160) && text(value.subtitle, 500) && value.simulated === true
    && Number.isSafeInteger(value.version) && value.version >= 0
    && typeof value.saved === 'boolean' && value.saved === (value.version > 0)
    && (value.updated_at === null || (text(value.updated_at, 40) && Number.isFinite(Date.parse(value.updated_at))))
    && steps.has(value.step_id) && Number.isInteger(value.step_number) && value.step_number >= 1 && value.step_number <= 3
    && value.total_steps === 3 && typeof value.completed === 'boolean' && value.completed === (value.step_id === 'complete')
    && text(value.prompt, 1500)
    && Array.isArray(value.messages) && value.messages.length <= 32
    && value.messages.every(message => record(message) && ['tutor', 'learner'].includes(message.role) && text(message.text, 12000))
    && Array.isArray(value.evidence) && value.evidence.length <= 8
    && value.evidence.every(item => record(item) && identifier(item.id) && text(item.title, 160) && text(item.content, 12000))
    && Array.isArray(value.options) && value.options.length <= 8
    && value.options.every(option => record(option) && identifier(option.id) && text(option.label, 1000))
    && new Set(value.options.map(option => option.id)).size === value.options.length
    && (value.completed ? value.options.length === 0 : value.options.length > 0)
    && (value.completed ? record(value.outcome) : value.outcome === null)
    && (value.outcome === null || (record(value.outcome)
      && ['creation', 'recovery', 'closure', 'next_action'].every(key => text(value.outcome[key], 1500))));
}

export function mountLessonChat({ document, window, fetch, crypto, location, confirm } = globalThis) {
  const get = id => document.querySelector('#' + id);
  const root = get('lesson-chat');
  if (!root || root.dataset.api !== API) throw new Error('Unsupported lesson chat');
  const status = get('chat-status');
  const retry = get('retry-decision');
  const reload = get('reload-progress');
  const login = get('chat-sign-in');
  const logout = get('chat-sign-out');
  const messages = get('chat-messages');
  const evidence = get('chat-evidence');
  const options = get('chat-options');
  const prompt = get('chat-prompt');
  const progress = get('chat-progress');
  const step = get('chat-step');
  const outcome = get('chat-outcome');
  const facts = get('outcome-facts');
  const chatgptHelp = get('chatgpt-help');
  const csrf = JSON.parse(get('academy-csrf')?.textContent || '""');
  let signedIn = typeof csrf === 'string' && csrf.length > 0;
  let ready = false;
  let busy = false;
  let projection = null;
  let pending = null;
  let generation = 0;

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function lock() {
    for (const button of options.querySelectorAll('button')) button.disabled = !ready || busy || Boolean(pending);
    retry.disabled = busy;
    reload.disabled = busy;
  }
  function clear() {
    projection = null;
    messages.replaceChildren();
    evidence.replaceChildren();
    options.replaceChildren();
    facts.replaceChildren();
    outcome.hidden = true;
    prompt.textContent = 'Sign in to continue your lesson.';
    progress.value = 0;
    progress.textContent = '0 of 3';
    step.textContent = 'Three decisions · about 3 minutes';
  }
  function ended(message) {
    generation += 1;
    signedIn = false;
    ready = false;
    busy = false;
    pending = null;
    clear();
    retry.hidden = reload.hidden = logout.hidden = true;
    login.hidden = false;
    status.textContent = message;
    lock();
  }
  function render(value, focus = false) {
    const previousCount = projection?.messages.length || 0;
    projection = value;
    messages.replaceChildren(...value.messages.map(message => {
      const item = element('li', 'chat-message');
      item.dataset.role = message.role;
      item.append(element('p', 'speaker', message.role === 'learner' ? 'You' : 'Docs'), element('p', 'message-text', message.text));
      return item;
    }));
    evidence.replaceChildren(...value.evidence.map(item => {
      const card = element('figure', 'evidence-card');
      card.append(element('figcaption', '', item.title), element('pre', '', item.content));
      return card;
    }));
    prompt.textContent = value.prompt;
    options.replaceChildren(...value.options.map((option, index) => {
      const button = element('button');
      button.type = 'button';
      button.dataset.option = option.id;
      button.append(element('span', 'option-letter', String.fromCharCode(65 + index)), element('span', 'option-label', option.label));
      button.addEventListener('click', () => choose(option.id));
      return button;
    }));
    progress.value = value.completed ? 3 : value.step_number - 1;
    progress.textContent = `${progress.value} of 3`;
    step.textContent = value.completed ? 'Lesson complete · 3 of 3' : `Step ${value.step_number} of ${value.total_steps}`;
    outcome.hidden = !value.completed || !value.outcome;
    facts.replaceChildren();
    if (!outcome.hidden) {
      for (const [key, label] of [['creation', 'Backup creation'], ['recovery', 'Recovery'], ['closure', 'Task closure'], ['next_action', 'Required action']]) {
        const row = element('div', 'outcome-row');
        row.append(element('dt', '', label), element('dd', '', value.outcome[key]));
        facts.append(row);
      }
    }
    lock();
    if (focus) {
      // Begin at the new feedback, so the learner reads it before the next choice.
      const feedback = messages.children[value.messages.findIndex((message, index) => index >= previousCount && message.role === 'tutor')];
      const target = feedback || prompt;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView?.({ block: 'start' });
    }
  }
  function showChatGptHelp() {
    if (location.hash !== '#chatgpt-help' || !chatgptHelp) return;
    chatgptHelp.open = true;
    chatgptHelp.scrollIntoView?.({ block: 'start' });
  }
  async function load() {
    if (!signedIn || busy || pending) return;
    const current = ++generation;
    ready = false;
    busy = true;
    retry.hidden = reload.hidden = true;
    lock();
    status.textContent = 'Loading your lesson…';
    try {
      const response = await fetch(API, { cache: 'no-store', credentials: 'same-origin' });
      if (!signedIn || current !== generation) return;
      if (response.status === 401) return ended('Your session ended. Sign in again to resume your saved lesson.');
      if (response.status === 403) return ended('Your Academy access is unavailable. Your saved choices are retained.');
      if (!response.ok) throw new Error('load');
      const body = await response.json();
      if (!signedIn || current !== generation) return;
      if (!isLessonProjection(body)) throw new Error('projection');
      ready = true;
      render(body);
      status.textContent = body.saved ? 'Your saved lesson is ready. Continue when you are.' : 'Ready when you are. Read the evidence, then choose.';
      showChatGptHelp();
    } catch {
      if (!signedIn || current !== generation) return;
      status.textContent = 'Your lesson could not be loaded. Reload saved progress before choosing.';
      reload.hidden = false;
    } finally {
      if (signedIn && current === generation) { busy = false; lock(); }
    }
  }
  async function sendPending() {
    if (!signedIn || busy || !pending) return;
    const current = generation;
    const request = pending;
    busy = true;
    retry.hidden = reload.hidden = true;
    logout.disabled = true;
    lock();
    status.textContent = 'Saving your choice…';
    try {
      const response = await fetch(API + '/decision', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(request),
      });
      if (!signedIn || current !== generation) return;
      if (response.status === 401) return ended('Your session ended. Sign in again to check your saved lesson.');
      if (response.status === 403) return ended('Your Academy access changed. Sign in again before continuing.');
      if (response.status === 409) {
        pending = null;
        ready = false;
        reload.hidden = false;
        status.textContent = 'This lesson changed in another window or ChatGPT. Reload saved progress before choosing again.';
        return;
      }
      if (!response.ok) {
        if (response.status < 500) {
          pending = null;
          ready = false;
          reload.hidden = false;
          status.textContent = 'That choice was not accepted. Reload saved progress before choosing again.';
          return;
        }
        throw new Error('save');
      }
      const body = await response.json();
      if (!signedIn || current !== generation) return;
      if (!isLessonProjection(body) || body.version !== request.expected_version + 1) throw new Error('projection');
      pending = null;
      ready = true;
      render(body, true);
      status.textContent = body.completed ? 'Lesson complete. Your choices and result are saved.' : 'Choice saved. Read the feedback, then continue.';
    } catch {
      if (!signedIn || current !== generation) return;
      retry.hidden = false;
      status.textContent = 'Your choice is not confirmed yet. Retry this choice to check the same save.';
    } finally {
      if (signedIn && current === generation) { busy = false; logout.disabled = false; lock(); }
    }
  }
  function choose(optionId) {
    if (!signedIn || !ready || busy || pending || !projection || projection.completed) return;
    if (!projection.options.some(option => option.id === optionId)) return;
    pending = { lesson_id: LESSON_ID, step_id: projection.step_id, option_id: optionId,
      expected_version: projection.version, request_id: crypto.randomUUID() };
    return sendPending();
  }
  retry.addEventListener('click', sendPending);
  reload.addEventListener('click', load);
  logout.addEventListener('click', async () => {
    if (pending && !confirm('This choice has not been confirmed. Sign out and check your saved progress next time?')) return;
    const current = ++generation;
    ready = false;
    busy = true;
    logout.disabled = true;
    clear();
    lock();
    try {
      const response = await fetch('/academy/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
      if (!signedIn || current !== generation) return;
      if (response.status === 401) return ended('Signed out. Sign in again to resume your saved lesson.');
      const body = await response.json();
      if (!signedIn || current !== generation) return;
      const incomplete = body.idp_logout === 'pending' || body.idp_logout === 'failed';
      if (response.ok || (response.status === 502 && incomplete)) {
        ended(incomplete ? 'Signed out of Academy. Sign-out at the login service is incomplete; close this browser on a shared device.' : 'Signed out. Sign in again to resume your saved lesson.');
      } else throw new Error('logout');
    } catch {
      if (!signedIn || current !== generation) return;
      status.textContent = 'Sign-out could not be confirmed. Retry Sign out before leaving a shared device.';
      retry.hidden = reload.hidden = true;
    } finally {
      if (signedIn && current === generation) { busy = false; logout.disabled = false; lock(); }
    }
  });
  window.addEventListener('beforeunload', event => {
    if (pending) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => ended('Your session must be checked again before showing saved choices.'));
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  window.addEventListener('hashchange', showChatGptHelp);
  lock();
  showChatGptHelp();
  return { ready: signedIn ? load() : Promise.resolve(), load };
}

if (typeof document !== 'undefined') mountLessonChat();
