import "server-only";

import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import type { OfferRevisionSnapshot } from "@/lib/offer-revision-snapshot";

/** Called only for a new issuance, after the public intake validates its intent. */
export function captureOfferRevisionSnapshot(
  intent: string | null,
  capturedAt: string,
): OfferRevisionSnapshot | undefined {
  if (intent !== PUBLIC_AGENT_ACTION_OFFER.id) return undefined;
  return {
    schemaVersion: 1,
    capturedAt,
    offerId: PUBLIC_AGENT_ACTION_OFFER.id,
    name: { ...PUBLIC_AGENT_ACTION_OFFER.name },
    scopeRevision: PUBLIC_AGENT_ACTION_OFFER.commercialContract.scope,
    price: {
      basis: PUBLIC_AGENT_ACTION_OFFER.commercialContract.price,
      ...PUBLIC_AGENT_ACTION_OFFER.price,
    },
    timing: {
      basis: PUBLIC_AGENT_ACTION_OFFER.commercialContract.timing,
      ...PUBLIC_AGENT_ACTION_OFFER.timing,
    },
  };
}
