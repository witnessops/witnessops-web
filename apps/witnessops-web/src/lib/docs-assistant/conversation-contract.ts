export interface AskConversationMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export const ASK_MAX_QUESTION_LENGTH = 2_000;
export const ASK_MAX_HISTORY_MESSAGES = 6;
export const ASK_MAX_HISTORY_CHARACTERS = 6_000;
export const ASK_MAX_HISTORY_MESSAGE_LENGTH = 4_000;

/** Keep recent complete exchanges in memory; never truncate a message mid-sentence. */
export function keepRecentAskHistory(
  messages: readonly AskConversationMessage[],
): AskConversationMessage[] {
  const result: AskConversationMessage[] = [];
  let characters = 0;
  for (let index = messages.length - 1; index > 0; index -= 2) {
    const user = messages[index - 1];
    const assistant = messages[index];
    if (user.role !== "user" || assistant.role !== "assistant") break;
    const pairCharacters = user.content.length + assistant.content.length;
    if (
      !user.content.trim() || !assistant.content.trim() ||
      user.content.length > ASK_MAX_QUESTION_LENGTH ||
      assistant.content.length > ASK_MAX_HISTORY_MESSAGE_LENGTH ||
      result.length + 2 > ASK_MAX_HISTORY_MESSAGES ||
      characters + pairCharacters > ASK_MAX_HISTORY_CHARACTERS
    ) break;
    result.unshift({ role: "user", content: user.content }, { role: "assistant", content: assistant.content });
    characters += pairCharacters;
  }
  return result;
}
