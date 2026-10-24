import "server-only";

import { z } from "zod";

import { McpPrincipal, requireScope } from "./auth";
import { AdminMcpDenial } from "./errors";
import { ADMIN_MCP_TOOLS, type AdminMcpToolName } from "./constants";
import {
  countsOutputSchema,
  deliverySchema,
  healthOutputSchema,
  listSchema,
  loadAdminMcpSnapshot,
  receiptSchema,
  reviewSchema,
  syncRunSchema,
} from "./read-model";

export interface ToolSuccess {
  body: unknown;
  returnedIds: string[];
  redactions: number;
  rows: number;
}

function pack(
  schema: z.ZodTypeAny,
  body: unknown,
  returnedIds: string[],
  redactions: number,
  rows: number,
): ToolSuccess {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AdminMcpDenial(503, "unavailable");
  return { body: parsed.data, returnedIds, redactions, rows };
}

export async function runNamedTool(
  name: AdminMcpToolName,
  principal: McpPrincipal,
  now: number,
): Promise<ToolSuccess> {
  const definition = ADMIN_MCP_TOOLS.find((tool) => tool.name === name);
  if (!definition) throw new AdminMcpDenial(400, "bad_request");
  requireScope(principal, definition.scope);
  const snapshot = await loadAdminMcpSnapshot(now);
  switch (name) {
    case "health_get":
      return pack(healthOutputSchema, snapshot.health, [], snapshot.redactions.health, 0);
    case "dashboard_counts":
      return pack(countsOutputSchema, snapshot.counts, [], snapshot.redactions.counts, 0);
    case "sync_runs_list":
      return pack(
        listSchema(syncRunSchema),
        { items: snapshot.syncRuns },
        snapshot.syncRuns.map((item) => item.syncRunId),
        snapshot.redactions.syncRuns,
        snapshot.syncRuns.length,
      );
    case "review_requests_list":
      return pack(
        listSchema(reviewSchema),
        { items: snapshot.reviews },
        snapshot.reviews.map((item) => item.id),
        snapshot.redactions.reviews,
        snapshot.reviews.length,
      );
    case "deliveries_list":
      return pack(
        listSchema(deliverySchema),
        { items: snapshot.deliveries },
        snapshot.deliveries.map((item) => item.id),
        snapshot.redactions.deliveries,
        snapshot.deliveries.length,
      );
    case "receipts_list":
      return pack(
        listSchema(receiptSchema),
        { items: snapshot.receipts },
        snapshot.receipts.map((item) => item.id),
        snapshot.redactions.receipts,
        snapshot.receipts.length,
      );
    default: {
      const unexpected: never = name;
      return unexpected;
    }
  }
}
