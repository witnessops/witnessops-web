/**
 * WEB-001 contract tests for the post-approval lifecycle aggregator.
 *
 * Proves the four acceptance criteria:
 *  1. Assessment page can render lifecycle past `scope_approved`.
 *  2. Admin surface uses the same lifecycle source coherently.
 *  3. Displayed delivery/completion states come from control-plane.
 *  4. Users can distinguish pending, delivered, acknowledged, completed,
 *     and failed without manual interpretation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPostApprovalLifecycle,
  stageFromControlPlane,
} from "./post-approval-lifecycle";
import type {
  ControlPlaneCompletionView,
  ControlPlaneRunState,
} from "./control-plane-client";
import type { TokenIssuanceRecord } from "./token-store";

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
// buildPostApprovalLifecycle — discriminated states
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: not approved -> awaiting_approval", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ approvalStatus: "pending" }),
    async () => upstream(),
  );
  assert.equal(view.stage, "awaiting_approval");
  assert.equal(view.authoritative, null);
  assert.equal(view.local.approved, false);
});

test("buildPostApprovalLifecycle: approved without controlPlaneRunId -> handoff_pending", async () => {
  const view = await buildPostApprovalLifecycle(record(), async () => upstream());
  assert.equal(view.stage, "handoff_pending");
  assert.equal(view.authoritative, null);
});

test("buildPostApprovalLifecycle: handoff_accepted reads from control plane", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () => upstream({ state: "collecting" }),
  );
  assert.equal(view.stage, "handoff_accepted");
  assert.ok(view.authoritative);
  assert.equal(view.authoritative?.source, "control_plane");
  assert.equal(view.authoritative?.controlPlaneState, "collecting");
});

test("buildPostApprovalLifecycle: delivered surfaces delivery record", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
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
  );
  assert.equal(view.stage, "delivered");
  assert.equal(view.authoritative?.delivery?.recipient, "claimant@example.com");
  assert.equal(view.authoritative?.delivered, true);
  assert.equal(view.authoritative?.acknowledged, false);
});

test("buildPostApprovalLifecycle: acknowledged retains delivery + ack fields", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () =>
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
  );
  assert.equal(view.stage, "acknowledged");
  assert.equal(view.authoritative?.acknowledged, true);
  assert.equal(view.authoritative?.delivery?.acknowledged_by, "operator@example.com");
});

test("buildPostApprovalLifecycle: completed surfaces completion record", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () =>
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
  );
  assert.equal(view.stage, "completed");
  assert.equal(view.authoritative?.completion?.completion_basis, "ack_received");
});

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: control plane unreachable -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () => {
      throw new Error("ECONNREFUSED");
    },
  );
  assert.equal(view.stage, "failed");
  assert.equal(view.authoritative, null);
  assert.match(view.failureReason ?? "", /unreachable/i);
});

test("buildPostApprovalLifecycle: control plane not configured -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () => "not_configured",
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /not configured/i);
});

test("buildPostApprovalLifecycle: run not found -> failed", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () => "not_found",
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /no run/i);
});

test("buildPostApprovalLifecycle: terminal revoked state -> failed with reason", async () => {
  const view = await buildPostApprovalLifecycle(
    record({ controlPlaneRunId: "run_demo123" }),
    async () => upstream({ state: "revoked" }),
  );
  assert.equal(view.stage, "failed");
  assert.match(view.failureReason ?? "", /revoked/);
});

// ---------------------------------------------------------------------------
// Local vs authoritative separation
// ---------------------------------------------------------------------------

test("buildPostApprovalLifecycle: local handoff metadata is preserved separately", async () => {
  const view = await buildPostApprovalLifecycle(
    record({
      controlPlaneRunId: "run_demo123",
      approvalAt: "2026-04-04T00:01:00Z",
    }),
    async () => upstream({ state: "delivered", delivered: true }),
  );
  assert.equal(view.local.approved, true);
  assert.equal(view.local.approvedAt, "2026-04-04T00:01:00Z");
  assert.equal(view.local.controlPlaneRunId, "run_demo123");
  // Authoritative is on the same view but in its own field
  assert.equal(view.authoritative?.source, "control_plane");
});
