import { buildAnswer } from './lesson-state.mjs';

const form = document.querySelector('#lesson-form');
const output = document.querySelector('#answer-text');
const status = document.querySelector('#lesson-status');
const teacherReply = document.querySelector('#teacher-reply');
const history = document.querySelector('#attempt-history');
let attempt = 1;
let earlierAttempts = [];
const authenticated = document.documentElement.hasAttribute('data-academy-authenticated');

function currentAnswer() {
  const get = (name) => form.elements.namedItem(name)?.value ?? null;
  return buildAnswer({
    attempt,
    claims: [1, 2, 3].map((index) => ({
      label: get(`claim-${index}`),
      reason: get(`reason-${index}`),
    })),
    limit: get('honest-limit'),
  });
}

function refreshAnswer() {
  output.value = currentAnswer();
}

function selectAnswer() {
  refreshAnswer();
  output.focus();
  output.select();
  output.setSelectionRange(0, output.value.length);
}

form.addEventListener('submit', (event) => event.preventDefault());
form.addEventListener('input', () => {
  refreshAnswer();
  status.textContent = '';
});

document.querySelector('#copy-answer').addEventListener('click', async () => {
  if (!form.reportValidity()) return;
  refreshAnswer();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(output.value);
    status.textContent = `Attempt ${attempt} copied. Paste it into your existing conversation with Docs.`;
  } catch {
    selectAnswer();
    status.textContent = 'Automatic copying is unavailable. Your answer is selected; copy it using your device’s copy command.';
  }
});

document.querySelector('#select-answer').addEventListener('click', () => {
  selectAnswer();
  status.textContent = 'Answer text selected. Copy it using your device’s copy command.';
});

document.querySelector('#start-retry').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  if (!teacherReply.value.trim()) {
    status.textContent = 'Paste the teacher’s reply before starting your next attempt.';
    teacherReply.focus();
    return;
  }

  const previous = { attempt, answer: currentAnswer(), reply: teacherReply.value };
  earlierAttempts.push(previous);
  renderEarlier(previous);

  attempt += 1;
  document.querySelector('#attempt-label').textContent = `Attempt ${attempt} · your own words`;
  teacherReply.value = '';
  refreshAnswer();
  status.textContent = `Attempt ${attempt} started. Your earlier answers are kept for editing. ${authenticated ? 'Save your work to keep this attempt.' : 'Nothing has been sent or saved outside this page.'}`;
  form.querySelector('input').focus();
  window.dispatchEvent(new Event('academy-progress-changed'));
});

// A restored tab must not silently restore an earlier learner's answers.
function clearPageState() {
  form.reset();
  teacherReply.value = '';
  history.replaceChildren();
  earlierAttempts = [];
  attempt = 1;
  document.querySelector('#attempt-label').textContent = 'Attempt 1 · your own words';
  status.textContent = '';
  refreshAnswer();
}

clearPageState();
window.addEventListener('pageshow', (event) => {
  if (event.persisted && !authenticated) clearPageState();
});

function renderEarlier(previous) {
  const earlier = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = `Attempt ${previous.attempt} · earlier attempt`;
  const contents = document.createElement('div');
  contents.className = 'in';
  const answer = document.createElement('pre');
  answer.textContent = previous.answer;
  const heading = document.createElement('h3');
  heading.textContent = 'Teacher reply you pasted';
  const reply = document.createElement('p');
  reply.className = 'pasted-reply';
  reply.textContent = previous.reply;
  contents.append(answer, heading, reply);
  earlier.append(summary, contents);
  history.append(earlier);
}

export function collectProgress() {
  const get = (name) => form.elements.namedItem(name)?.value ?? null;
  return { schema: 1, attempt,
    claims: [1, 2, 3].map(i => ({ label: get(`claim-${i}`) || null, reason: get(`reason-${i}`) || '' })),
    limit: get('honest-limit') || '', teacherReply: teacherReply.value, history: earlierAttempts };
}

export function restoreProgress(d) {
  clearPageState();
  attempt = d.attempt;
  d.claims.forEach((claim, i) => {
    const radio = [...form.querySelectorAll(`input[name="claim-${i + 1}"]`)].find(el => el.value === claim.label);
    if (radio) radio.checked = true;
    form.elements.namedItem(`reason-${i + 1}`).value = claim.reason;
  });
  form.elements.namedItem('honest-limit').value = d.limit;
  teacherReply.value = d.teacherReply;
  earlierAttempts = d.history;
  earlierAttempts.forEach(renderEarlier);
  document.querySelector('#attempt-label').textContent = `Attempt ${attempt} · your own words`;
  refreshAnswer();
}

export { clearPageState };
