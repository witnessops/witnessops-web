export const HELP_PAGES = {
  overview: { label: 'Overview', questions: ['How do I get started?', 'What does a workspace contain?'] },
  members: { label: 'Members', questions: ['Which role should I choose?', 'Why can’t this person accept an invitation?'] },
  results: { label: 'Results and Share', questions: ['What does Undetermined mean?', 'What does revoking a Share link stop?', 'How do I export evidence?'] },
  assets: { label: 'Assets and checks', questions: ['How do I authorize a hostname check?', 'How do I import a Linux result?'] },
  settings: { label: 'Settings', questions: ['How do I manage workspace access?', 'Does payment authorize a check?'] },
} as const;
export type HelpPage = keyof typeof HELP_PAGES;
export function helpPage(path: string): HelpPage {
  if (path === '/members') return 'members';
  if (/^\/(reports|runs)(\/|$)/.test(path)) return 'results';
  if (/^\/assets(\/|$)/.test(path)) return 'assets';
  return path === '/settings' ? 'settings' : 'overview';
}
export function helpPayload(raw: unknown): { question: string; page: HelpPage } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid question.');
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).sort().join() !== 'page,question' || typeof input.question !== 'string' || !input.question.trim() || input.question.length > 1800 || typeof input.page !== 'string' || !Object.hasOwn(HELP_PAGES,input.page)) throw new Error('Submit a question and a supported page category only.');
  return { question: input.question.trim(), page: input.page as HelpPage };
}
export type HelpAnswer = { status: string; facts: string[]; inference: string[]; limits: string[]; sources: {title:string;url?:string}[]; reason?:string };
