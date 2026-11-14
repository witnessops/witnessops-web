import { buildAnswer } from './lesson-state.mjs';

const form = document.querySelector('#lesson-form');
const output = document.querySelector('#answer-text');
const status = document.querySelector('#lesson-status');
const teacherReply = document.querySelector('#teacher-reply');
const history = document.querySelector('#attempt-history');
let attempt = 1;

function currentAnswer() {
  const data = new FormData(form);
  const fields = [...form.querySelectorAll('[data-claim]')];
  const sources = fields.length > 0 ? fields : [1, 2, 3];
  return buildAnswer({
    title: form.dataset.lessonTitle,
    attempt,
    claims: sources.map((field, index) => ({
      text: typeof field === 'number' ? undefined : field.dataset.claim,
      label: data.get(`claim-${index + 1}`),
      reason: data.get(`reason-${index + 1}`),
    })),
    limit: data.get('honest-limit'),
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

  const earlier = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = `Attempt ${attempt} · earlier in this page`;
  const contents = document.createElement('div');
  contents.className = 'in';
  const answer = document.createElement('pre');
  answer.textContent = currentAnswer();
  const heading = document.createElement('h3');
  heading.textContent = 'Teacher reply you pasted';
  const reply = document.createElement('p');
  reply.className = 'pasted-reply';
  reply.textContent = teacherReply.value;
  contents.append(answer, heading, reply);
  earlier.append(summary, contents);
  history.append(earlier);

  attempt += 1;
  document.querySelector('#attempt-label').textContent = `Attempt ${attempt} · your own words`;
  teacherReply.value = '';
  refreshAnswer();
  status.textContent = `Attempt ${attempt} started. Your earlier answers are kept for editing. Nothing has been sent or saved outside this page.`;
  form.querySelector('input').focus();
});

// A restored tab must not silently restore an earlier learner's answers.
function clearPageState() {
  form.reset();
  teacherReply.value = '';
  history.replaceChildren();
  attempt = 1;
  document.querySelector('#attempt-label').textContent = 'Attempt 1 · your own words';
  status.textContent = '';
  refreshAnswer();
}

clearPageState();
window.addEventListener('pageshow', (event) => {
  if (event.persisted) clearPageState();
});
