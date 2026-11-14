export const CLAIMS = Object.freeze([
  'The 02:00 backup run completed.',
  'All 3 databases saved.',
  'Restore tested.',
]);

export const LABELS = Object.freeze(['Evidenced', 'Only claimed', 'Contradicted']);

const plainText = (value) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

/** Formats only the learner's input. No answer key, grading or generated feedback. */
export function buildAnswer({ attempt = 1, claims = [], limit = '' } = {}) {
  const number = Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1;
  const lines = [`Lesson 1 · Report or evidence? · attempt ${number}`];
  CLAIMS.forEach((claim, index) => {
    const response = claims[index] ?? {};
    const label = LABELS.includes(response.label) ? response.label : 'Not chosen';
    lines.push(`${index + 1}. ${claim}`, `Label: ${label}`, `Artifact and reason: ${plainText(response.reason) || 'Not written'}`);
  });
  lines.push(`Limit: ${plainText(limit) || 'Not written'}`);
  return lines.join('\n');
}
