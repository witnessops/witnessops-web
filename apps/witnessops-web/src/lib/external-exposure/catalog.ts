import type { Metadata } from "next";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { PUBLIC_CONTACT_EMAIL, publicContactMailto } from "@/lib/public-contact";
import { canonicalUrl } from "@/lib/public-seo";

import type {
  ExposureSnapshotNamedOffer,
  ExposureSnapshotNeedsReviewTerm,
} from "./types";

/**
 * Root marketing slug, same shape as `/why-witnessops` and `/proof-backed-security-systems`.
 * Kept off `/check` (the ten-observation tool) and off `/catalog/offsec-external-exposure`
 * (the paid External Attack Surface Review contract).
 */
export const EXPOSURE_SNAPSHOT_ROUTE = "/external-exposure-snapshot" as const;

export const EXPOSURE_SNAPSHOT_CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL;

export const EXPOSURE_SNAPSHOT_MAILTO = publicContactMailto(
  "Free External Exposure Snapshot",
);

/**
 * The files under `public/samples/offsec-external-exposure/` are already published
 * as the synthetic External Attack Surface Review package. That package is not a
 * Snapshot of WitnessOps infrastructure, so the proof section stays a placeholder.
 */
export const EXPOSURE_SNAPSHOT_SAMPLE_PLACEHOLDER = "Sample: Needs review";

export const EXPOSURE_SNAPSHOT_NEEDS_REVIEW = [
  { id: "turnaround", phrase: "2 business days" },
  { id: "observations", phrase: "Up to 3 manually-validated observations" },
  { id: "one-page", phrase: "one page" },
] as const satisfies readonly ExposureSnapshotNeedsReviewTerm[];

/** The only offer names this landing may use. The Snapshot itself is not a priced offer. */
export const EXPOSURE_SNAPSHOT_ALLOWED_OFFERS = [
  {
    name: PUBLIC_AGENT_ACTION_OFFER.name.en,
    price: PUBLIC_AGENT_ACTION_OFFER.price.en,
  },
  {
    name: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
    price: EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
  },
] as const satisfies readonly ExposureSnapshotNamedOffer[];

export const EXPOSURE_SNAPSHOT_REVIEW = {
  name: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
  price: EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
  href: EXTERNAL_ATTACK_SURFACE_OFFER.route.en,
  inclusions: EXTERNAL_ATTACK_SURFACE_OFFER.result.en,
} as const;

export const EXPOSURE_SNAPSHOT_DESCRIPTION =
  "A free, passive, outside-in snapshot of one internet-facing system. No credentials, no exploitation, and no penetration test. An enquiry is not authorisation to test.";

export const exposureSnapshotMetadata = {
  title: "Free External Exposure Snapshot",
  description: EXPOSURE_SNAPSHOT_DESCRIPTION,
  alternates: { canonical: canonicalUrl(EXPOSURE_SNAPSHOT_ROUTE) },
  openGraph: {
    title: "Free External Exposure Snapshot | WitnessOps",
    description: EXPOSURE_SNAPSHOT_DESCRIPTION,
    siteName: "WitnessOps",
    type: "website" as const,
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Free External Exposure Snapshot | WitnessOps",
    description: EXPOSURE_SNAPSHOT_DESCRIPTION,
  },
} satisfies Metadata;
