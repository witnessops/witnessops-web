/**
 * Contract tests for the post-approval lifecycle aggregator.
 *
 * Covers WEB-001 (read/render baseline) and WEB-002 (delivery failure
 * and retry UX) acceptance criteria.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPostApprovalLifecycle,
  stageFromControlPlane,
  type BuildLifecycleDeps,
} from "./post-approval-lifecycle";
import type {
  ControlPlaneCompletionView,
  ControlPlaneRunState,
} from "./control-plane-client";
import type { TokenIssuanceRecord } from "./token-store";
import type { DeliveryRetryRequestRecord } from "./delivery-retry-ledger";

function record(
  overrides: Partial<TokenIssuanceRecord> = {},
): TokenIssuanceRecord {
  return {
    issuanceId: "iss_test",
    intakeId: "intake_test",
    channel: "email",
    email: "claimant@example.com",
    verifiedAt: "2026-04-04T00:00:00Z",
    approvalStatus: "approved",
    approvalAt: "2026-04-04T00:01:00Z",
    status: "verified",
    ...overrides,
  } as TokenIssuanceRecord;
}

function upstream(
  overrides: Partial<ControlPlaneCompletionView> = {},
): ControlPlaneCompletionView {
  return {
    run_id: "run_demo123",
    state: "bundled" as ControlPlaneRunState,
    delivered: false,
    acknowledged: false,
    completed: false,
    completion_status: "not_yet_complete",
    delivery: null,
    completion: null,
    ...overrides,
  };
}

/** Hermetic deps: never touches the real disk or network. */
function deps(
  fetchUpstream: BuildLifecycleDeps["fetchUpstream"],
  latestRetry: DeliveryRetryRequestRecord | null = null,
): BuildLifecycleDeps {
  return {
    fetchUpstream,
    fetchLatestRetry: async () => latestRetry,
  };
}

function retry(
  overrides: Partial<DeliveryRetryRequestRecord> = {},
): DeliveryRetryRequestRecord {
  return {
    event_id: "evt_test",
    run_id: "run_demo123",
    requested_at: "2026-04-07T09:55:00Z",
    requested_by: "operator@example.com",
    reason: "delivery bounced",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// stageFromControlPlane
// ---------------------------------------------------------------------------

test("stageFromControlPlane: bundled -> delivery_pending", () => {
  assert.equal(stageFromControlPlane(upstream({ state: "bundled" })), "delivery_pending");
});

test("stageFromControlPlane: in-progress states -> handoff_accepted", () => {
  for (const state of [
    "requested",
    "authorized",
    "scope_locked",
    "token_issued",
    "collecting",
    "deriving",
    "decision_recorded",
    "coverage_recorded",
  ] as const) {
    assert.equal(
      stageFromControlPlane(upstream({ state })),
      "handoff_accepted",
      `expected handoff_accepted for ${state}`,
    );
  }
});

test("stageFromControlPlane: delivered/acknowledged/completed map to themselves", () => {
  assert.equal(
    stageFromControlPlane(upstream({ state: "delivered", delivered: true })),
    "delivered",
  );
  assert.equal(
    stageFromControlPlane(
      upstream({ state: "acknowledged", delivered: true, acknowledged: true }),
    ),
    "acknowledged",
  );
  assert.equal(
    stageFromControlPlane(
      upstream({
        state: "completed",
        delivered: true,
        acknowledged: true,
        completed: true,
        completion_status: "completed",
      }),
    ),
    "completed",
  );
});

test("stageFromControlPlane: revoked/failed -> failed", () => {
  assert.equal(stageFromControlPlane(upstream({ state: "revoked" })), "failed");
  assert.equal(stageFromControlPlane(upstream({ state: "failed" })), "failed");
});

// ---------------------------------------------------------------------------
// buildPostApprovalLifecycle — discriminated states (WEB-001)
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: not approved -> awaiting_approval", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ approvalStatus: "pending" }),
    deps(async () => upstream()),
  );
  assert.equal(view.stage, "awaiting_approval");
  assert.equal(view.authoritative, null);
  assert.equal(view.local.approved, false);
});

test("buildPostApprovalLifecycle: approved without controlPlaneRunId -> handoff_pending", async () => {
  const view = await buildPostApprovalLifecycle(record(), deps(async () => upstream()));
  assert.equal(view.stage, "handoff_pending");
  assert.equal(view.authoritative, null);
});

test("buildPostApprovalLifecycle: handoff_accepted reads from control plane", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => upstream({ state: "collecting" })),
  );
  assert.equal(view.stage, "handoff_accepted");
  assert.ok(view.authoritative);
  assert.equal(view.authoritative?.source, "control_plane");
  assert.equal(view.authoritative?.controlPlaneState, "collecting");
});

test("buildPostApprovalLifecycle: delivered surfaces delivery record", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () =>
      upstream({
        state: "delivered",
        delivered: true,
        delivery: {
          schema: "delivery_record",
          run_id: "run_demo123",
          bundle_id: "bundle:abc",
          artifact_hash: "sha256:abc",
          recipient: "claimant@example.com",
          channel: "email",
          delivered_at: "2026-04-07T10:00:00Z",
        },
      }),
    ),
  );
  assert.equal(view.stage, "delivered");
  assert.equal(view.authoritative?.delivery?.recipient, "claimant@example.com");
  assert.equal(view.authoritative?.delivered, true);
  assert.equal(view.authoritative?.acknowledged, false);
});

test("buildPostApprovalLifecycle: acknowledged retains delivery + ack fields", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () =>
      upstream({
        state: "acknowledged",
        delivered: true,
        acknowledged: true,
        delivery: {
          schema: "delivery_record",
          run_id: "run_demo123",
          bundle_id: "bundle:abc",
          artifact_hash: "sha256:abc",
          recipient: "claimant@example.com",
          channel: "email",
          delivered_at: "2026-04-07T10:00:00Z",
          acknowledged_at: "2026-04-07T10:05:00Z",
          acknowledged_by: "operator@example.com",
          acknowledgment_method: "email_reply",
        },
      }),
    ),
  );
  assert.equal(view.stage, "acknowledged");
  assert.equal(view.authoritative?.acknowledged, true);
  assert.equal(view.authoritative?.delivery?.acknowledged_by, "operator@example.com");
});

test("buildPostApprovalLifecycle: completed surfaces completion record", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () =>
      upstream({
        state: "completed",
        delivered: true,
        acknowledged: true,
        completed: true,
        completion_status: "completed",
        completion: {
          schema: "engagement_completion",
          run_id: "run_demo123",
          completed_at: "2026-04-07T10:10:00Z",
          completed_by: "operator@example.com",
          completion_basis: "ack_received",
        },
      }),
    ),
  );
  assert.equal(view.stage, "completed");
  assert.equal(view.authoritative?.completion?.completion_basis, "ack_received");
});

// ---------------------------------------------------------------------------
// Failure paths (WEB-001)
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: control plane unreachable -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => {
      throw new Error("ECONNREFUSED");
    }),
  );
  assert.equal(view.stage, "failed");
  assert.equal(view.authoritative, null);
  assert.match(view.failureReason ?? "", /unreachable/i);
});

test("buildPostApprovalLifecycle: control plane not configured -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => "not_configured"),
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /not configured/i);
});

test("buildPostApprovalLifecycle: run not found -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => "not_found"),
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /no run/i);
});

test("buildPostApprovalLifecycle: terminal revoked state -> failed with reason", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => upstream({ state: "revoked" })),
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /revoked/);
});

// ---------------------------------------------------------------------------
// Local vs authoritative separation (WEB-001)
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: local handoff metadata is preserved separately", async () => {
  const view = await buildPostApprovalLifecycle(
    record({
      controlPlaneRunId: "run_demo123",
      approvalAt: "2026-04-04T00:01:00Z",
    }),
    deps(async () => upstream({ state: "delivered", delivered: true })),
  );
  assert.equal(view.local.approved, true);
  assert.equal(view.local.approvedAt, "2026-04-04T00:01:00Z");
  assert.equal(view.local.controlPlaneRunId, "run_demo123");
  // Authoritative is on the same view but in its own field
  assert.equal(view.authoritative?.source, "control_plane");
});

// ---------------------------------------------------------------------------
// WEB-002: retry / failure UX
// ---------------------------------------------------------------------------

test("WEB-002: retry against revoked upstream -> retry_pending (request never implies success)", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => upstream({ state: "revoked" }), retry()),
  );
  assert.equal(view.stage, "retry_pending");
  assert.ok(view.retryRequest);
  assert.equal(view.retryRequest?.recovered, false);
  assert.equal(view.retryRequest?.requestedBy, "operator@example.com");
  assert.match(view.failureReason ?? "", /revoked/);
});

test("WEB-002: retry against unreachable control plane -> retry_pending", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => {
      throw new Error("ECONNREFUSED");
    }, retry()),
  );
  assert.equal(view.stage, "retry_pending");
  assert.equal(view.authoritative, null);
  assert.match(view.failureReason ?? "", /unreachable/i);
});

test("WEB-002: retry against not_found -> retry_pending", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => "not_found", retry()),
  );
  assert.equal(view.stage, "retry_pending");
  assert.equal(view.authoritative, null);
});

test("WEB-002: retry against not_configured -> retry_pending", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => "not_configured", retry()),
  );
  assert.equal(view.stage, "retry_pending");
});

test("WEB-002: failure with no retry stays in failed (no auto-retry)", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => upstream({ state: "revoked" }), null),
  );
  assert.equal(view.stage, "failed");
  assert.equal(view.retryRequest, null);
});

test("WEB-002: successful recovery after retry -> delivered with recovered=true", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(
      async () =>
        upstream({
          state: "delivered",
          delivered: true,
          delivery: {
            schema: "delivery_record",
            run_id: "run_demo123",
            bundle_id: "bundle:abc",
            artifact_hash: "sha256:abc",
            recipient: "claimant@example.com",
            channel: "email",
            delivered_at: "2026-04-07T10:00:00Z",
          },
        }),
      retry({ requested_at: "2026-04-07T09:55:00Z" }),
    ),
  );
  assert.equal(view.stage, "delivered");
  assert.ok(view.retryRequest);
  assert.equal(view.retryRequest?.recovered, true);
});

test("WEB-002: retry requested AFTER delivery is not flagged as recovered", async () => {
  // Operator requested a redundant retry after delivery had already landed.
  // The view must not retroactively claim recovery.
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(
      async () =>
        upstream({
          state: "delivered",
          delivered: true,
          delivery: {
            schema: "delivery_record",
            run_id: "run_demo123",
            bundle_id: "bundle:abc",
            artifact_hash: "sha256:abc",
            recipient: "claimant@example.com",
            channel: "email",
            delivered_at: "2026-04-07T10:00:00Z",
          },
        }),
      retry({ requested_at: "2026-04-07T11:00:00Z" }),
    ),
  );
  assert.equal(view.stage, "delivered");
  assert.equal(view.retryRequest?.recovered, false);
});

test("WEB-002: retry request never implies delivery success on its own", async () => {
  // The acceptance criterion: a retry action does not itself imply
  // delivery success. With upstream still bundled (delivery_pending) and
  // a retry recorded, the stage stays delivery_pending (forward stage),
  // not delivered.
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    deps(async () => upstream({ state: "bundled" }), retry()),
  );
  assert.equal(view.stage, "delivery_pending");
  assert.equal(view.authoritative?.delivered, false);
  assert.equal(view.retryRequest?.recovered, false);
});
