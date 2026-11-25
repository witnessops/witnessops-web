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

export function registerChatTools(server, { store, admitted, ownerId, requiredScope }) {
  const reply = (body, isError = false) => ({ ...(isError ? { isError: true } : {}), content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body });
  for (const name of ['start_lesson', 'resume_lesson', 'inspect_evidence', 'submit_decision', 'get_progress']) {
    const tool = toolByName(name);
    server.registerTool(name, {
      title: tool.title, description: tool.description,
      inputSchema: tool.inputSchema, annotations: tool.annotations,
      _meta: {
        securitySchemes: [{ type: 'oauth2', scopes: [requiredScope] }],
        ...(['start_lesson', 'resume_lesson'].includes(name)
          ? { ui: { resourceUri: CHAT_VIEW_RESOURCE_URI } } : {}),
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
