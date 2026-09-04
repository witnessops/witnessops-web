import { compareRfc3339Instants } from "./rfc3339-instant";

export const verificationDeliveryStatuses = [
  "unknown",
  "provider_accepted",
  "delivery_delayed",
  "delivered",
  "bounced",
  "failed",
  "suppressed",
] as const;

export type VerificationDeliveryStatus =
  (typeof verificationDeliveryStatuses)[number];

export interface VerificationDeliveryMetadataLike {
  status?: VerificationDeliveryStatus;
  providerAcceptedAt?: string | null;
  statusObservedAt?: string | null;
  providerMessageId?: string | null;
  /** Legacy field written before downstream status tracking existed. */
  deliveredAt?: string | null;
}

export function inferVerificationDeliveryStatus(
  delivery: VerificationDeliveryMetadataLike,
): VerificationDeliveryStatus {
  if (delivery.status) return delivery.status;
  if (
    delivery.providerAcceptedAt ||
    delivery.providerMessageId ||
    delivery.deliveredAt
  ) {
    return "provider_accepted";
  }
  return "unknown";
}

export function verificationDeliveryObservedAt(
  delivery: VerificationDeliveryMetadataLike,
): string | null {
  return (
    delivery.statusObservedAt ??
    delivery.providerAcceptedAt ??
    delivery.deliveredAt ??
    null
  );
}

const verificationDeliveryStatusRank: Record<VerificationDeliveryStatus, number> =
  {
    unknown: 0,
    provider_accepted: 1,
    delivery_delayed: 2,
    delivered: 3,
    bounced: 3,
    failed: 3,
    suppressed: 3,
  };

export function shouldReplaceVerificationDeliveryStatus(args: {
  currentStatus: VerificationDeliveryStatus;
  currentObservedAt: string | null;
  nextStatus: VerificationDeliveryStatus;
  nextObservedAt: string;
}): boolean {
  if (!args.currentObservedAt) return true;

  const instantOrder = compareRfc3339Instants(
    args.nextObservedAt,
    args.currentObservedAt,
  );
  if (instantOrder > 0) return true;
  if (instantOrder < 0) return false;

  return (
    verificationDeliveryStatusRank[args.nextStatus] >=
    verificationDeliveryStatusRank[args.currentStatus]
  );
}
