/**
 * Tests for deriveAlerts — customer acceptance signals (WEB-020).
 *
 * Covers the new customer-rejected alert path added in WEB-020.
 * Existing alert conditions (reconciliation, stale accepted, awaiting
 * response, evidence conflict, divergence) are not retested here.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { AdmissionQueueRow } from "@/lib/server/admission-queue";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";
import { QUEUE_FILTER_KEYS } from "./queue-filter-keys";
import { deriveAlerts } from "./admin-alert-derive";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseRow(overrides: Partial<AdmissionQueueRow> = {}): AdmissionQueueRow {
  return {
    intakeId: "intake_1",
    email: "claimant@example.com",
    updatedAt: "2026-04-05T10:00:00Z",
    createdAt: "2026-04-05T09:00:00Z",
    respondedAt: "2026-04-05T09:30:00Z",
    state: "responded",
    reconciliationPending: false,
    reconciliationResolved: false,
    responseProviderOutcomeStatus: null,
    responseProviderOutcomeObservedAt: null,
    mailboxReceiptStatus: null,
    hasDivergence: false,
    controlPlaneRunId: "run_1",
    ...overrides,
  } as AdmissionQueueRow;
}

function rejectedLifecycleMap(
  runId: string,
  customerAcceptanceAt: string | null = "2026-04-06T10:00:00Z",
): Map<string, PostApprovalLifecycleView> {
  const map = new Map<string, PostApprovalLifecycleView>();
  map.set(runId, {
    stage: "rejected",
    local: { approved: true, approvedAt: null, controlPlaneRunId: runId },
    authoritative: {
      source: "control_plane",
      controlPlaneState: "rejected",
      delivered: true,
      acknowledged: true,
      completed: false,
      delivery: null,
      completion: null,
      customerAcceptanceDisposition: "rejected",
      customerAcceptanceAt,
    },
    retryRequest: null,
    failureReason: null,
  } as unknown as PostApprovalLifecycleView);
  return map;
}

function acceptedLifecycleMap(runId: string): Map<string, PostApprovalLifecycleView> {
  const map = new Map<string, PostApprovalLifecycleView>();
  map.set(runId, {
    stage: "accepted",
    local: { approved: true, approvedAt: null, controlPlaneRunId: runId },
    authoritative: {
      source: "control_plane",
      controlPlaneState: "accepted",
      delivered: true,
      acknowledged: true,
      completed: false,
      delivery: null,
      completion: null,
      customerAcceptanceDisposition: "accepted",
      customerAcceptanceAt: "2026-04-06T10:00:00Z",
    },
    retryRequest: null,
    failureReason: null,
  } as unknown as PostApprovalLifecycleView);
  return map;
}

// ---------------------------------------------------------------------------
// WEB-020 tests
// ---------------------------------------------------------------------------

test("WEB-020: rejected lifecycle stage emits a customer-rejected alert", () => {
  const alerts = deriveAlerts([baseRow()], rejectedLifecycleMap("run_1"));
  const alert = alerts.find((a) => a.id === "customer-rejected-intake_1");
  assert.ok(alert, "expected a customer-rejected alert");
});

test("WEB-020: customer-rejected alert has category 'system'", () => {
  const alerts = deriveAlerts([baseRow()], rejectedLifecycleMap("run_1"));
  const alert = alerts.find((a) => a.id === "customer-rejected-intake_1");
  assert.equal(alert?.category, "system");
});

test("WEB-020: customer-rejected alert has filterKey customerRejected", () => {
  const alerts = deriveAlerts([baseRow()], rejectedLifecycleMap("run_1"));
  const alert = alerts.find((a) => a.id === "customer-rejected-intake_1");
  assert.equal(alert?.filterKey, QUEUE_FILTER_KEYS.customerRejected);
});

test("WEB-020: customer-rejected alert uses customerAcceptanceAt as timestamp", () => {
  const alerts = deriveAlerts(
    [baseRow()],
    rejectedLifecycleMap("run_1", "2026-04-06T10:00:00Z"),
  );
  const alert = alerts.find((a) => a.id === "customer-rejected-intake_1");
  assert.equal(alert?.timestamp, "2026-04-06T10:00:00Z");
});

test("WEB-020: customer-rejected alert falls back to row.updatedAt when customerAcceptanceAt is null", () => {
  const row = baseRow({ updatedAt: "2026-04-05T10:00:00Z" });
  const alerts = deriveAlerts([row], rejectedLifecycleMap("run_1", null));
  const alert = alerts.find((a) => a.id === "customer-rejected-intake_1");
  assert.equal(alert?.timestamp, "2026-04-05T10:00:00Z");
});

test("WEB-020: accepted lifecycle stage does NOT emit a customer alert", () => {
  const alerts = deriveAlerts([baseRow()], acceptedLifecycleMap("run_1"));
  const customerAlert = alerts.find((a) => a.id.startsWith("customer-"));
  assert.equal(customerAlert, undefined);
});

test("WEB-020: row without controlPlaneRunId does NOT emit a customer-rejected alert", () => {
  const row = baseRow({ controlPlaneRunId: null });
  const alerts = deriveAlerts([row], rejectedLifecycleMap("run_1"));
  const customerAlert = alerts.find((a) => a.id.startsWith("customer-rejected"));
  assert.equal(customerAlert, undefined);
});

test("WEB-020: empty lifecycleByRunId emits no customer alerts", () => {
  const alerts = deriveAlerts([baseRow()], new Map());
  const customerAlert = alerts.find((a) => a.id.startsWith("customer-"));
  assert.equal(customerAlert, undefined);
});
