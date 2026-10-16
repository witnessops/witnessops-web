/** Buyer-facing Snapshot landing types. Not the live `/check` observation contract. */

export const EXPOSURE_SNAPSHOT_NEEDS_REVIEW_IDS = [
  "turnaround",
  "observations",
  "one-page",
] as const;

export type ExposureSnapshotNeedsReviewId =
  (typeof EXPOSURE_SNAPSHOT_NEEDS_REVIEW_IDS)[number];

/** A phrase that is not fixed in commercial-truth and must stay visibly marked. */
export type ExposureSnapshotNeedsReviewTerm = {
  id: ExposureSnapshotNeedsReviewId;
  phrase: string;
};

export type ExposureSnapshotNamedOffer = {
  name: string;
  price: string;
};
