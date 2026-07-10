import "server-only";

export interface NormalizedAskRequest {
  readonly question: string;
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

const MAX_QUESTION_LENGTH = 2000;

export function normalizeAskRequest(raw: unknown): NormalizeResult | NormalizeError {
  if (raw === null || typeof raw !== "object") {
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

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      failureClass: "FAILURE_INPUT_MALFORMED",
      message: `question must not exceed ${MAX_QUESTION_LENGTH} characters`,
    };
  }

  // Minimal context handling (optional, not used for classification in V1)
  // We do not validate or forward context here to keep the normalizer thin.

  return {
    ok: true,
    request: { question },
  };
}
