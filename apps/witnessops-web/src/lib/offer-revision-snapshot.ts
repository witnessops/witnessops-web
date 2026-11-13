import { ASK_AI_CONTACT_INTENT } from "@/lib/commercial-request-intents";

/** Recorded offer context at enquiry time, never an accepted agreement. */
export interface OfferRevisionSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  offerId: string;
  name: { en: string; pl: string };
  scopeRevision: string;
  price: { basis: string; en: string; pl: string };
  timing: { basis: string; en: string; pl: string };
}

export function offerRevisionFields(submission: {
  intent?: string | null;
  offerSnapshot?: OfferRevisionSnapshot;
}): Array<{ label: string; value: string }> {
  const snapshot = submission.offerSnapshot;
  if (!snapshot) {
    return submission.intent && submission.intent !== ASK_AI_CONTACT_INTENT
      ? [{ label: "Offer revision", value: "Unversioned — no offer snapshot recorded. Confirm accepted terms separately." }]
      : [];
  }

  // Read recorded values. Never resolve historical snapshots against today's offer.
  return [
    { label: "Offer at enquiry", value: `${snapshot.name.en} (${snapshot.offerId})` },
    { label: "Offer revision", value: snapshot.scopeRevision },
    { label: "Price basis at enquiry", value: snapshot.price.basis },
    { label: "Price at enquiry", value: snapshot.price.en },
    { label: "Timing basis at enquiry", value: snapshot.timing.basis },
    { label: "Timing at enquiry", value: snapshot.timing.en },
    { label: "Offer captured at", value: snapshot.capturedAt },
    { label: "Offer snapshot boundary", value: "Enquiry context only. An agreed SOW and testing authorization are separate." },
  ];
}
