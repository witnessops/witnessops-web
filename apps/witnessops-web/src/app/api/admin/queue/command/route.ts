import { NextRequest, NextResponse } from "next/server";

import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  applyQueueCommand,
  type QueueCommandName,
  type QueueCommandPayload,
} from "@/lib/server/queue-command-executor";

export const runtime = "nodejs";

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface QueueCommandBody {
  command?: string;
  intakeId?: string;
  expectedProjectionVersion?: number;
  expectedEventSequence?: number;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

const ALLOWED_COMMANDS: QueueCommandName[] = [
  "queue.claim",
  "queue.assign",
  "queue.reassign",
  "queue.unassign",
  "queue.override_assign",
  "queue.set_priority",
  "queue.request_clarification",
  "queue.clear_clarification",
  "queue.start_scope_draft",
  "queue.approve_scope_contract",
  "queue.supersede_scope_contract",
  "queue.withdraw_scope_contract",
  "queue.record_response",
];

function isQueueCommandName(value: string): value is QueueCommandName {
  return ALLOWED_COMMANDS.includes(value as QueueCommandName);
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedAdminSession(request);
  if (!session) {
    return invalid("Unauthorized.", 401);
  }

  let body: QueueCommandBody;
  try {
    body = (await request.json()) as QueueCommandBody;
  } catch {
    return invalid("Invalid request body.", 400);
  }

  const command = typeof body.command === "string" ? body.command : "";
  const intakeId = typeof body.intakeId === "string" ? body.intakeId : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const payload =
    body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!command || !intakeId || !idempotencyKey) {
    return invalid("command, intakeId, and idempotencyKey are required.", 400);
  }
  if (!isQueueCommandName(command)) {
    return invalid("Unknown queue command.", 400);
  }

  try {
    const commandPayload: QueueCommandPayload = {
      command,
      ...(payload as Record<string, unknown>),
    } as QueueCommandPayload;
    const result = await applyQueueCommand(
      {
        intakeId,
        actor: session.actor,
        actorAuthSource: session.actorAuthSource,
        actorSessionHash: session.actorSessionHash,
        isAdmin: true,
        expectedProjectionVersion: body.expectedProjectionVersion,
        expectedEventSequence: body.expectedEventSequence,
        idempotencyKey,
        source: "api/admin/queue/command",
      },
      commandPayload,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue command failed.";
    return invalid(message, 500);
  }
}
