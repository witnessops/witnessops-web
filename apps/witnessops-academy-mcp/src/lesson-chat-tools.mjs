import { CHAT_LESSON } from '../../witnessops-academy-server/src/lesson-chat-engine.mjs';
import { readLessonChat, submitLessonDecision } from '../../witnessops-academy-server/src/lesson-chat-store.mjs';
import { withPilotAdmission } from './pilot-access.mjs';
import { CHAT_TOOL_NAMES, toolByName } from './tools.mjs';

const result = ({ status, body }) => ({
  ...(status >= 400 ? { isError: true } : {}),
  content: [{ type: 'text', text: JSON.stringify(status >= 400 ? { ...body, status } : body) }],
  structuredContent: status >= 400 ? { ...body, status } : body,
});

/** No learner identifier or persisted storage key is exposed in discovery. */
export function lessonChatMetadata(lessonId) {
  return lessonId === CHAT_LESSON.id ? {
    revision: CHAT_LESSON.revision,
    path: '/academy/learn/report-or-evidence/chat',
    start_tool: 'start_lesson',
    shared_progress: true,
    simulated: true,
  } : null;
}

/**
 * The same deterministic store serves website decisions and MCP decisions.
 * Admission is checked for every invocation, including evidence-only reads.
 * Both original worksheet tools and this adapter use the validated issuer/sub
 * mapping. No tool argument can nominate an owner or a storage key.
 */
export function registerLessonChatTools(server, { db, policy, ownerId }) {
  for (const name of CHAT_TOOL_NAMES) {
    const tool = toolByName(name);
    const admitted = withPilotAdmission({ db, policy, ownerId }, async (args, extra, admittedOwner) => {
      // The SDK validates this schema too. Keep the adapter boundary strict when
      // invoked directly by another first-party interface or a test harness.
      const parsed = tool.inputSchema.safeParse(args);
      if (!parsed.success) return result({ status: 400, body: { error: 'invalid_fields' } });
      try {
        const owner = admittedOwner ?? await ownerId(extra.authInfo);
        const response = name === 'submit_decision'
          ? await submitLessonDecision(db, owner, parsed.data)
          : await readLessonChat(db, owner, parsed.data.lesson_id);
        return result(response);
      } catch {
        // Do not expose database messages, connection details or saved content.
        return result({ status: 503, body: { error: 'progress_unavailable' } });
      }
    });
    server.registerTool(name, {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }, admitted);
  }
}
