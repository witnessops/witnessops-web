import { readFileSync } from 'node:fs';

// The UI is only a presentation for the existing learner-scoped chat tools.
// It contains no saved learner state, secrets, external URLs, or assessments.
export const CHAT_VIEW_RESOURCE_URI = 'ui://witnessops-academy/decision-room-v1.html';
const MIME_TYPE = 'text/html;profile=mcp-app';
const html = readFileSync(new URL('./chat-view.html', import.meta.url), 'utf8');

export function registerChatView(server) {
  server.registerResource('academy-decision-room', CHAT_VIEW_RESOURCE_URI, {
    title: 'Academy Decision Room',
    description: 'A compact interactive view of the authenticated learner\'s existing saved lesson.',
    mimeType: MIME_TYPE,
  }, async uri => ({
    contents: [{
      uri: uri.href,
      mimeType: MIME_TYPE,
      text: html,
      _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } },
    }],
  }));
}
