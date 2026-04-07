/**
 * Contract tests for the customer proof package view assembler (WEB-013).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildCustomerProofPackageView,
  stageFrom,
} from "./customer-proof-package";
import type {
  ControlPlaneCompletionView,
  ControlPlaneCustomerAcceptanceRecord,
  ControlPlaneDeliveryRecord,
  ControlPlaneRunState,
} from "./control-plane-client";

function delivery(
  overrides: Partial<ControlPlaneDeliveryRecord> = {},
): ControlPlaneDeliveryRecord {
  return {
    schema: "delivery_record",
    run_id: "run_demo",
    bundle_id: "bundle_abc",
    artifact_hash: "sha256:deadbeef",
    recipient: "claimant@example.com",
    channel: "email",
    delivered_at: "2026-04-05T12:00:00Z",
    ...overrides,
  };
}

function completion(
  overrides: Partial<ControlPlaneCompletionView> = {},
): ControlPlaneCompletionView {
  return {
    run_id: "run_demo",
    state: "delivered" as ControlPlaneRunState,
    delivered: true,
    acknowledged: false,
    completed: false,
    completion_status: "not_yet_complete",
    delivery: delivery(),
    completion: null,
    ...overrides,
  };
}

function acceptance(
  overrides: Partial<ControlPlaneCustomerAcceptanceRecord> = {},
): ControlPlaneCustomerAcceptanceRecord {
  return {
    schema: "customer_acceptance_record",
    run_id: "run_demo",
    disposition: "accepted",
    accepted_by: "customer@example.com",
    accepted_at: "2026-04-06T09:00:00Z",
    bundle_id: "bundle_abc",
    artifact_hash: "sha256:deadbeef",
    comment: null,
    ...overrides,
  };
}

test("stageFrom: pre-delivery -> not_yet_delivered", () => {
  assert.equal(
    stageFrom(
      completion({ state: "bundled", delivered: false, delivery: null }),
      null,
    ),
    "not_yet_delivered",
  );
});

test("stageFrom: delivered -> delivered", () => {
  assert.equal(stageFrom(completion(), null), "delivered");
});

test("stageFrom: acknowledged -> acknowledged", () => {
  assert.equal(
    stageFrom(
      completion({ state: "acknowledged", acknowledged: true }),
      null,
    ),
    "acknowledged",
  );
});

test("stageFrom: accepted record overrides acknowledged state", () => {
  assert.equal(
    stageFrom(
      completion({ state: "acknowledged", acknowledged: true }),
      acceptance({ disposition: "accepted" }),
    ),
    "accepted",
  );
});

test("stageFrom: rejected record yields rejected", () => {
  assert.equal(
    stageFrom(
      completion({ state: "acknowledged", acknowledged: true }),
      acceptance({ disposition: "rejected" }),
    ),
    "rejected",
  );
});

test("stageFrom: control-plane state accepted without record still resolves", () => {
  assert.equal(
    stageFrom(
      completion({ state: "accepted" as ControlPlaneRunState, acknowledged: true }),
      null,
    ),
    "accepted",
  );
});

test("buildCustomerProofPackageView: delivered package surfaces identity and delivery facts", () => {
  const view = buildCustomerProofPackageView(completion(), null);
  assert.equal(view.stage, "delivered");
  assert.equal(view.identity.runId, "run_demo");
  assert.equal(view.identity.bundleId, "bundle_abc");
  assert.equal(view.identity.artifactHash, "sha256:deadbeef");
  assert.equal(view.delivery.delivered, true);
  assert.equal(view.delivery.deliveredAt, "2026-04-05T12:00:00Z");
  assert.equal(view.delivery.channel, "email");
  assert.equal(view.delivery.recipient, "claimant@example.com");
  assert.equal(view.disposition, null);
});

test("buildCustomerProofPackageView: pre-delivery has null delivery facts", () => {
  const view = buildCustomerProofPackageView(
    completion({ state: "bundled", delivered: false, delivery: null }),
    null,
  );
  assert.equal(view.stage, "not_yet_delivered");
  assert.equal(view.identity.bundleId, null);
  assert.equal(view.identity.artifactHash, null);
  assert.equal(view.delivery.delivered, false);
  assert.equal(view.delivery.deliveredAt, null);
});

test("buildCustomerProofPackageView: accepted disposition surfaces actor and timestamp", () => {
  const view = buildCustomerProofPackageView(
    completion({ state: "acknowledged", acknowledged: true }),
    acceptance({ comment: "looks good" }),
  );
  assert.equal(view.stage, "accepted");
  assert.deepEqual(view.disposition, {
    disposition: "accepted",
    acceptedBy: "customer@example.com",
    acceptedAt: "2026-04-06T09:00:00Z",
    comment: "looks good",
  });
});

test("buildCustomerProofPackageView: rejected disposition is preserved", () => {
  const view = buildCustomerProofPackageView(
    completion({ state: "acknowledged", acknowledged: true }),
    acceptance({ disposition: "rejected", comment: null }),
  );
  assert.equal(view.stage, "rejected");
  assert.equal(view.disposition?.disposition, "rejected");
  assert.equal(view.disposition?.comment, null);
});
