import "server-only";
import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";
import {
  ASK_MAX_QUESTION_LENGTH,
  ASK_MAX_HISTORY_MESSAGES,
  ASK_MAX_HISTORY_CHARACTERS,
  ASK_MAX_HISTORY_MESSAGE_LENGTH,
  type AskConversationMessage,
} from "@/lib/docs-assistant/conversation-contract";

export interface NormalizedAskRequest {
  readonly question: string;
  readonly history?: readonly AskConversationMessage[];
  readonly page_service_id?: BuyerService["id"];
}

export interface NormalizeResult {
  readonly ok: true;
  readonly request: NormalizedAskRequest;
}

export interface NormalizeError {
  readonly ok: false;
  readonly failureClass: "FAILURE_INPUT_MALFORMED";
  readonly message: string;
}

export function normalizeAskRequest(raw: unknown): NormalizeResult | NormalizeError {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: "request body must be a JSON object",
    };
  }

  const body = raw as Record<string, unknown>;

  if (typeof body.question !== "string") {
    return {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: "question must be a string",
    };
  }

  const question = body.question.trim();

  if (question.length === 0) {
    return {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: "question must not be empty",
    };
  }

  if (question.length > ASK_MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: `question must not exceed ${ASK_MAX_QUESTION_LENGTH} characters`,
    };
  }

  let history: AskConversationMessage[] | undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history) || body.history.length > ASK_MAX_HISTORY_MESSAGES) {
      return malformed(`history must be an array of at most ${ASK_MAX_HISTORY_MESSAGES} messages`);
    }
    history = [];
    let characters = 0;
    for (const value of body.history) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return malformed("each history message must contain a user or assistant role and content");
      }
      const message = value as Record<string, unknown>;
      if (
        Object.keys(message).sort().join(",") !== "content,role" ||
        (message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" || !message.content.trim()
      ) {
        return malformed("each history message must contain only a user or assistant role and non-empty content");
      }
      const limit = message.role === "user" ? ASK_MAX_QUESTION_LENGTH : ASK_MAX_HISTORY_MESSAGE_LENGTH;
      if (message.content.length > limit) return malformed(`history message must not exceed ${limit} characters`);
      characters += message.content.length;
      if (characters > ASK_MAX_HISTORY_CHARACTERS) {
        return malformed(`history must not exceed ${ASK_MAX_HISTORY_CHARACTERS} characters in total`);
      }
      history.push({ role: message.role, content: message.content.trim() });
    }
  }

  let pageServiceId: BuyerService["id"] | undefined;
  if (body.page_service_id !== undefined) {
    const service = BUYER_SERVICES.find((item) => item.id === body.page_service_id);
    if (!service) return malformed("page_service_id must identify a public WitnessOps service");
    pageServiceId = service.id;
  }

  return {
    ok: true,
    request: { question, ...(history ? { history } : {}), ...(pageServiceId ? { page_service_id: pageServiceId } : {}) },
  };
}

function malformed(message: string): NormalizeError {
  return { ok: false, failureClass: "FAILURE_INPUT_MALFORMED", message };
}
