import test from "node:test";
import assert from "node:assert/strict";

import {
  getAssessmentAuthorizationSummary,
  type AssessmentAuthorizationSummary,
} from "./assessment-authorization-summary";
import type { PostApprovalLifecycleView } from "./post-approval-lifecycle";

function view(
  stage: PostApprovalLifecycleView["stage"],
): PostApprovalLifecycleView {
  const local = {
    approved: true,
    approvedAt: "2026-04-08T02:00:00Z",
    controlPlaneRunId: "run_demo123",
  };

  if (stage === "authorization_pending") {
    return {
      stage,
      local,
      authoritative: {
        source: "control_plane",
        controlPlaneState: "requested",
        delivered: false,
        acknowledged: false,
        completed: false,
        delivery: null,
        completion: null,
        customerAcceptanceDisposition: null,
        customerAcceptanceAt: null,
      },
      retryRequest: null,
      failureReason: null,
    };
  }

  if (
    stage === "authorized" ||
    stage === "delivery_pending" ||
    stage === "delivered" ||
    stage === "acknowledged" ||
    stage === "accepted" ||
    stage === "rejected" ||
    stage === "completed"
  ) {
    return {
      stage,
      local,
      authoritative: {
        source: "control_plane",
        controlPlaneState: "authorized",
        delivered: false,
        acknowledged: false,
        completed: false,
        delivery: null,
        completion: null,
        customerAcceptanceDisposition: null,
        customerAcceptanceAt: null,
      },
      retryRequest: null,
      failureReason: null,
    };
  }

  if (stage === "retry_pending") {
    return {
      stage,
      local,
      authoritative: null,
      retryRequest: {
        requestedAt: "2026-04-08T02:01:00Z",
        requestedBy: "operator@example.com",
        reason: "retry",
        recovered: false,
      },
      failureReason: null,
    };
  }

  if (stage === "failed") {
    return {
      stage,
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: "failed",
    };
  }

  return {
    stage: "handoff_pending",
    local,
    authoritative: null,
    retryRequest: null,
    failureReason: null,
  };
}

function assertSummary(
  actual: AssessmentAuthorizationSummary,
  expectedLead: string,
  detailSubstring: string,
) {
  assert.equal(actual.messageLead, expectedLead);
  assert.match(actual.detail, new RegExp(detailSubstring));
}

test("requested run renders awaiting-start summary copy", () => {
  assertSummary(
    getAssessmentAuthorizationSummary(view("authorization_pending")),
    "Passive-only recon awaiting start for",
    "authorize/start this run",
  );
});

test("authorized run renders authorized summary copy", () => {
  assertSummary(
    getAssessmentAuthorizationSummary(view("authorized")),
    "Passive-only recon authorized for",
    "authorized by control plane",
  );
});

test("approved run without authoritative handoff stays pending", () => {
  assertSummary(
    getAssessmentAuthorizationSummary(view("handoff_pending")),
    "Passive-only recon pending handoff for",
    "handoff is not yet complete",
  );
});
