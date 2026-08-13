import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  ADMIN_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";
import {
  applyQueueCommand,
  isQueueCommandName,
  parseQueueCommandPayload,
  QueueCommandInputError,
} from "@/lib/server/queue-command-executor";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await readBoundedRequestJson(request, ADMIN_JSON_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return invalid("Request body is too large.", 413);
    }
    return invalid("Invalid request body.", 400);
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return invalid("Invalid request body.", 400);
  }
  const body = rawBody as Record<string, unknown>;

  const command = typeof body.command === "string" ? body.command : "";
  const intakeId = typeof body.intakeId === "string" ? body.intakeId : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (command.length > 64 || intakeId.length > 256 || idempotencyKey.length > 512) {
    return invalid("Command identifiers are too long.", 400);
  }
  if (
    body.payload !== undefined &&
    (!body.payload ||
      typeof body.payload !== "object" ||
      Array.isArray(body.payload))
  ) {
    return invalid("payload must be an object.", 400);
  }
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  if (!command || !intakeId || !idempotencyKey) {
    return invalid("command, intakeId, and idempotencyKey are required.", 400);
  }
  if (!isQueueCommandName(command)) {
    return invalid("Unknown queue command.", 400);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "command")) {
    return invalid("payload.command is not allowed.", 400);
  }
  if (
    !Number.isSafeInteger(body.expectedProjectionVersion) ||
    !Number.isSafeInteger(body.expectedEventSequence) ||
    (body.expectedProjectionVersion as number) < 0 ||
    (body.expectedEventSequence as number) < 0
  ) {
    return invalid(
      "expectedProjectionVersion and expectedEventSequence are required non-negative integers.",
      400,
    );
  }

  try {
    const commandPayload = parseQueueCommandPayload({
      ...(payload as Record<string, unknown>),
      command,
    });
    const result = await applyQueueCommand(
      {
        intakeId,
        actor: session.actor,
        actorAuthSource: session.actorAuthSource,
        actorSessionHash: session.actorSessionHash,
        role: session.role,
        expectedProjectionVersion: body.expectedProjectionVersion as number,
        expectedEventSequence: body.expectedEventSequence as number,
        idempotencyKey,
        source: "api/admin/queue/command",
      },
      commandPayload,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QueueCommandInputError) {
      return invalid(error.message, 400);
    }
    const message = error instanceof Error ? error.message : "Queue command failed.";
    return invalid(message, 500);
  }
}
