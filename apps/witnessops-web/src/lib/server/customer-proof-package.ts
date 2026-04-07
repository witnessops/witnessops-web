/**
 * Customer proof package view assembler (WEB-013).
 *
 * Read-only aggregator that turns control-plane truth (completion view +
 * optional customer-acceptance record) into a customer-facing view model.
 *
 * Web must not write delivery/acknowledgment/acceptance — those are
 * control-plane authority (CP-001/CP-002/CP-003). This module only reads.
 */

import type {
  ControlPlaneCompletionView,
  ControlPlaneCustomerAcceptanceRecord,
} from "./control-plane-client";

export type PackageStage =
  | "not_yet_delivered"
  | "delivered"
  | "acknowledged"
  | "accepted"
  | "rejected";

export interface PackageIdentity {
  runId: string;
  bundleId: string | null;
  artifactHash: string | null;
}

export interface PackageDelivery {
  delivered: boolean;
  deliveredAt: string | null;
  channel: string | null;
  recipient: string | null;
  acknowledgedAt: string | null;
}

export interface PackageDisposition {
  disposition: "accepted" | "rejected";
  acceptedBy: string;
  acceptedAt: string;
  comment: string | null;
}

export interface CustomerProofPackageView {
  stage: PackageStage;
  identity: PackageIdentity;
  delivery: PackageDelivery;
  disposition: PackageDisposition | null;
}

/**
 * Derive stage from control-plane truth.
 *
 * Disposition (accepted/rejected) takes precedence over acknowledgment,
 * which takes precedence over delivery, which takes precedence over
 * not-yet-delivered. The state machine guarantees these are monotonic.
 */
export function stageFrom(
  completion: ControlPlaneCompletionView,
  acceptance: ControlPlaneCustomerAcceptanceRecord | null,
): PackageStage {
  if (acceptance) return acceptance.disposition;
  if (completion.state === "accepted") return "accepted";
  if (completion.state === "rejected") return "rejected";
  if (completion.acknowledged) return "acknowledged";
  if (completion.delivered) return "delivered";
  return "not_yet_delivered";
}

export function buildCustomerProofPackageView(
  completion: ControlPlaneCompletionView,
  acceptance: ControlPlaneCustomerAcceptanceRecord | null,
): CustomerProofPackageView {
  const delivery = completion.delivery;
  return {
    stage: stageFrom(completion, acceptance),
    identity: {
      runId: completion.run_id,
      bundleId: delivery?.bundle_id ?? acceptance?.bundle_id ?? null,
      artifactHash:
        delivery?.artifact_hash ?? acceptance?.artifact_hash ?? null,
    },
    delivery: {
      delivered: completion.delivered,
      deliveredAt: delivery?.delivered_at ?? null,
      channel: delivery?.channel ?? null,
      recipient: delivery?.recipient ?? null,
      acknowledgedAt: delivery?.acknowledged_at ?? null,
    },
    disposition: acceptance
      ? {
          disposition: acceptance.disposition,
          acceptedBy: acceptance.accepted_by,
          acceptedAt: acceptance.accepted_at,
          comment: acceptance.comment,
        }
      : null,
  };
}
