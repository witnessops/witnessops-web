import { validateChatRequest } from '../../witnessops-academy-server/src/chat-store.mjs';
import { toolByName } from './tools.mjs';
import { CHAT_VIEW_RESOURCE_URI } from './chat-view.mjs';

/** The owner is supplied by the existing validated OAuth/admission wrapper only. */
export async function handleChatTool(name, args, { store, owner }) {
  if (name === 'get_progress') return store.progress(owner);
  if (name === 'resume_lesson' || name === 'inspect_evidence') return store.resume(owner, args.lesson_id);
  if (name === 'start_lesson') {
    const request = validateChatRequest({ action: 'start', request_id: args.request_id });
    return store.start(owner, args.lesson_id, request);
  }
  if (name === 'submit_decision') {
    const { lesson_id, ...decision } = args;
    const request = validateChatRequest({ action: 'submit', ...decision });
    return store.submit(owner, lesson_id, request);
  }
  throw Object.assign(new Error('unknown_tool'), { code: 'unknown_tool', status: 404 });
}

// MCP Apps tool visibility (SEP-1865 `_meta.ui.visibility`). The Decision Room
// view may ask the host to call only the tools it actually uses: start_lesson,
// submit_decision, and resume_lesson (the fresh read after a rejected write).
// Every other tool, including the legacy worksheet tools, is model-only.
export const APP_CALLABLE_TOOLS = Object.freeze(['start_lesson', 'resume_lesson', 'submit_decision']);
export const MODEL_ONLY_UI_META = Object.freeze({ visibility: Object.freeze(['model']) });
export function chatToolUiMeta(name) {
  const visibility = APP_CALLABLE_TOOLS.includes(name) ? ['model', 'app'] : ['model'];
  return ['start_lesson', 'resume_lesson'].includes(name)
    ? { resourceUri: CHAT_VIEW_RESOURCE_URI, visibility } : { visibility };
}

export function registerChatTools(server, { store, admitted, ownerId, requiredScope }) {
  const reply = (body, isError = false) => ({ ...(isError ? { isError: true } : {}), content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body });
  for (const name of ['start_lesson', 'resume_lesson', 'inspect_evidence', 'submit_decision', 'get_progress']) {
    const tool = toolByName(name);
    server.registerTool(name, {
      title: tool.title, description: tool.description,
      inputSchema: tool.inputSchema, annotations: tool.annotations,
      _meta: {
        securitySchemes: [{ type: 'oauth2', scopes: [requiredScope] }],
        ui: chatToolUiMeta(name),
      },
    }, admitted(async (args, extra, admittedOwner) => {
      try {
        const owner = admittedOwner ?? await ownerId(extra.authInfo);
        return reply(await handleChatTool(name, args, { store, owner }));
      } catch (error) {
        if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500 && /^[a-z_]+$/.test(error.code ?? '')) return reply({ error: error.code, status: error.status }, true);
        return reply({ error: 'lesson_unavailable', status: 503 }, true);
      }
    }));
  }
}
