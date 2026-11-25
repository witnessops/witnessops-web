/**
 * Source-only Microsoft Teams invitation-card adapter.
 * It does not authenticate a Teams user or read/write Academy progress.
 * Academy's existing Keycloak session and admission checks remain authoritative.
 */
const ACADEMY_ORIGIN = 'https://academy.witnessops.com';
const CASES = Object.freeze({
  'report-or-evidence': Object.freeze({
    title: 'Report or evidence?',
    prompt: 'An AI agent reports that the work is done. Which records actually prove it?',
  }),
  'same-scope': Object.freeze({
    title: 'Same record, wrong scope?',
    prompt: 'The evidence looks convincing. But does it establish the result being claimed?',
  }),
});

export const SUPPORTED_CASE_IDS = Object.freeze(Object.keys(CASES));

/** Return a Teams-compatible Adaptive Card message, not a message-sending action. */
export function academyCaseCard(caseId) {
  if (typeof caseId !== 'string' || !Object.hasOwn(CASES, caseId)) {
    throw new RangeError('Unsupported Academy case');
  }
  const selected = CASES[caseId];
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: {
        $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          { type: 'TextBlock', text: 'WitnessOps Academy · Decision Room', weight: 'Bolder', wrap: true },
          { type: 'TextBlock', text: selected.title, size: 'Large', weight: 'Bolder', wrap: true },
          { type: 'TextBlock', text: selected.prompt, wrap: true },
          { type: 'TextBlock', text: 'Your decisions remain private in Academy. Access requires an approved Academy place.', isSubtle: true, wrap: true },
        ],
        actions: [{
          type: 'Action.OpenUrl',
          title: 'Open investigation',
          url: `${ACADEMY_ORIGIN}/academy/learn/${caseId}`,
        }],
      },
    }],
  };
}
