export const CLAIMS = Object.freeze([
  'The 02:00 backup run completed.',
  'All 3 databases saved.',
  'Restore tested.',
]);

export const LABELS = Object.freeze(['Evidenced', 'Only claimed', 'Contradicted']);

const LESSON_ONE_TITLE = 'Lesson 1 · Report or evidence?';

const plainText = (value) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

/** Formats only the learner's input. No answer key, grading or generated feedback. */
export function buildAnswer({ attempt = 1, title, claims = [], limit = '' } = {}) {
  const number = Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1;
  const heading = plainText(title) || LESSON_ONE_TITLE;
  const lines = [`${heading} · attempt ${number}`];
  const custom = claims.some((item) => plainText(item?.text));
  const items = custom
    ? claims
    : CLAIMS.map((text, index) => ({
      text,
      label: claims[index]?.label,
      reason: claims[index]?.reason,
    }));
  items.forEach((response, index) => {
    const claimText = plainText(response?.text) || 'Not written';
    const label = LABELS.includes(response?.label) ? response.label : 'Not chosen';
    lines.push(`${index + 1}. ${claimText}`, `Label: ${label}`, `Artifact and reason: ${plainText(response?.reason) || 'Not written'}`);
  });
  lines.push(`Limit: ${plainText(limit) || 'Not written'}`);
  return lines.join('\n');
}
